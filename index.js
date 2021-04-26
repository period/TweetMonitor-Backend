var Twitter = require("twitter-v2");
const credentials = require("./credentials.json");
const mysql = require("mysql");
var pool = mysql.createPool({
    connectionLimit: 10,
    "host": credentials.database.host,
    "user": credentials.database.username,
    "password": credentials.database.password,
    "database": credentials.database.database,
    debug: false
});


var stream_client = new Twitter({
    bearer_token: credentials.twitter.bearer_token
})
var api_client = new Twitter({
    consumer_key: credentials.twitter.consumer.key,
    consumer_secret: credentials.twitter.consumer.secret,
    access_token_key: credentials.twitter.access_token.key,
    access_token_secret: credentials.twitter.access_token.secret
})

async function getTweetMetricsByID(id) {
    const { data: tweets, errors } = await api_client.get('tweets',
        {
            ids: id,
            tweet: {
                fields: ["non_public_metrics", "public_metrics", "organic_metrics"]
            }
        }
    );
    if(errors) return console.error(errors);

    let tweet = tweets[0];
    pool.query("INSERT INTO tweet_metrics VALUES (null, " + mysql.escape(id) + ", " + new Date().getTime() + ", " + mysql.escape(tweet.public_metrics.retweet_count) + ", " + mysql.escape(tweet.public_metrics.quote_count) + ", " + mysql.escape(tweet.public_metrics.like_count) + ", " + mysql.escape(tweet.public_metrics.reply_count) + ", " + mysql.escape(tweet.non_public_metrics.impression_count) + ", " + mysql.escape(tweet.non_public_metrics.user_profile_clicks) + ", " + mysql.escape(JSON.stringify(tweet)) + ");", (error) => {
        if(error) console.error("Error inserting metrics into SQL");
    })
}

setInterval(() => {
    pool.query("SELECT tweet_id, created_at FROM tweets WHERE next_monitor IS NOT NULL AND next_monitor < " + new Date().getTime() + " ORDER BY next_monitor ASC LIMIT 1", (error, rows) => {
        if(error) return console.error("Error querying for monitored tweets");
        for(let i = 0; i < rows.length; i++) {
            getTweetMetricsByID(rows[i].tweet_id.toString());
            let hoursAge = (new Date().getTime() - rows[i].created_at) / 3600000;
            if(hoursAge < 24) schedule = new Date().getTime() + 30000; // 30 seconds
            else if(hoursAge < 120) schedule = new Date().getTime() + 60000; // 60 seconds
            else if(hoursAge >= 720) schedule = "null";
            else schedule = new Date().getTime() + 300000; // 5 minutes
            pool.query("UPDATE tweets SET next_monitor = " + schedule + " WHERE tweet_id = " + rows[i].tweet_id, (error) => {
                if(error) return console.error("Error scheduling tweet");
            })
        }
    })
}, (10*1000));

async function getTweetByIDForInsert(id) {
    const { data: tweets, errors } = await api_client.get('tweets', { ids: id, tweet: {fields: ["non_public_metrics", "created_at", "author_id", "public_metrics", "entities", "organic_metrics"]}});
    if(errors) return console.error(errors);

    let tweet = tweets[0];
    pool.query("INSERT INTO tweets VALUES (" + mysql.escape(tweet.id) + ", " + mysql.escape(tweet.text) + ", " + mysql.escape(tweet.author_id) + ", " + new Date(tweet.created_at).getTime() + ", " + new Date().getTime() + ", " + mysql.escape(JSON.stringify(tweet)) + ");", (error) => {
        if(error) console.error("Error inserting tweet into SQL");
    });

}

async function listenForever(streamFactory, dataConsumer) {
    try {
      for await (const { data } of streamFactory()) {
        dataConsumer(data);
      }
      console.log("Stream disconnected healthily. Reconnecting.");
      listenForever(streamFactory, dataConsumer);
    } catch (error) {
      console.warn("Stream disconnected with error. Retrying.", error);
      listenForever(streamFactory, dataConsumer);
    }
}

listenForever(
    () => stream_client.stream("tweets/search/stream"),
    (data) => getTweetByIDForInsert(data.id)
);