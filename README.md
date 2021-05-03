# TweetMonitor-Backend
Monitors for new tweets from a specified account and regularly records metrics using the Twitter v2 API to a MySQL database.

For accompanying frontend: https://github.com/period/TweetMonitor-Frontend

## Instructions
1) Grab an API key and the relevant tokens from Twitter's developer portal
2) Create a MySQL database and create the following tables:
```
CREATE TABLE `tweets` (
  `tweet_id` varchar(64) NOT NULL,
  `text` text NOT NULL,
  `author_id` bigint(64) NOT NULL,
  `created_at` bigint(64) NOT NULL,
  `next_monitor` bigint(64) DEFAULT NULL,
  `raw` text NOT NULL
) ENGINE=Aria DEFAULT CHARSET=utf8mb4;
CREATE TABLE `tweet_metrics` (
  `id` int(6) NOT NULL,
  `tweet` varchar(64) NOT NULL,
  `timestamp` bigint(64) NOT NULL,
  `retweets` int(6) NOT NULL,
  `quotes` int(6) NOT NULL,
  `likes` int(6) NOT NULL,
  `replies` int(6) NOT NULL,
  `impressions` int(6) NOT NULL,
  `profile_clicks` int(6) NOT NULL,
  `raw` text NOT NULL
) ENGINE=Aria DEFAULT CHARSET=utf8mb4;
ALTER TABLE `tweet_metrics`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `tweets`
  ADD UNIQUE KEY `tweet_id` (`tweet_id`);
ALTER TABLE `tweet_metrics`
  MODIFY `id` int(6) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;
```
3) Run the script. I registered mine as a service for continuous 24/7 operation

4) You may wish to drop the raw columns and modify the script as appropriate to conserve disk space. I am keeping the raw responses returned by Twitter for debugging purposes as well as being able to backdate data should the API change.
