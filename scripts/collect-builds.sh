#!/bin/bash
echo "collect dist"
# 目标聚合目录
TARGET_DIR="./dist"

# ======== 新增参数判断逻辑 ========
if [ $# -eq 0 ]; then
  # 无参数时：清空整个 dist 目录
  echo "Cleaning ENTIRE $TARGET_DIR directory"
  rm -rf "$TARGET_DIR"
else
  # 有参数时：仅删除指定子目录（比如 app-purple）
  target_to_remove="$1"
  echo "Cleaning specific directory: $TARGET_DIR/$target_to_remove"
  rm -rf "$TARGET_DIR/$target_to_remove"
fi

# 确保目标目录存在
mkdir -p "$TARGET_DIR"

# ======== 原有构建逻辑 ========
find ./packages -maxdepth 1 -type d -name "app-*" | while read -r dir; do
  project_name=$(basename "$dir")
  # 注意这里根据需求选择是否保留前缀：
  clean_name="${project_name}"         # 保留前缀（目标目录：app-purple）
  # clean_name="${project_name#app-}"  # 移除前缀（目标目录：purple）

  src_dir="$dir/dist"
  dest_dir="$TARGET_DIR/$clean_name"

  if [ -d "$src_dir" ]; then
    echo "Copying $project_name → $dest_dir"
    mkdir -p "$dest_dir"
    cp -r "$src_dir"/* "$dest_dir"
  else
    echo "Warning: $project_name has no dist directory"
  fi
done

echo "Build aggregation completed ➔ $TARGET_DIR"