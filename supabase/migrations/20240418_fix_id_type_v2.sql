-- 1. 删除外键约束
ALTER TABLE user_reviews DROP CONSTRAINT user_reviews_restaurant_id_fkey;

-- 2. 修改 restaurants 表的 id 字段类型
ALTER TABLE restaurants ALTER COLUMN id TYPE VARCHAR(255);

-- 3. 修改 user_reviews 表的 restaurant_id 字段类型
ALTER TABLE user_reviews ALTER COLUMN restaurant_id TYPE VARCHAR(255);

-- 4. 重新添加外键约束（现在类型匹配了，都是 VARCHAR）
ALTER TABLE user_reviews ADD CONSTRAINT user_reviews_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
