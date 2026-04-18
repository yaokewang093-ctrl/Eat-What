-- 修改评价表中的 restaurant_id 字段类型为 VARCHAR，以兼容高德地图的字符串 ID
ALTER TABLE user_reviews ALTER COLUMN restaurant_id TYPE VARCHAR(255);
