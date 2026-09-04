# OfferFlow 公开链接发布指南

## 最省事的方式

1. 登录 GitHub，新建一个公开仓库，建议名称填写 `offerflow`。
2. 将“OfferFlow-GitHub源码发布包.zip”解压后，把其中全部文件上传到仓库根目录。
3. 确认默认分支名称为 `main`。
4. 打开仓库的 `Settings`，进入 `Pages`。
5. 在发布来源中选择 `GitHub Actions`。
6. 等待仓库顶部 `Actions` 中的发布任务变成绿色。

完成后的公开网址通常是：

```text
https://你的用户名.github.io/offerflow/
```

## 数据与隐私

公开网站不会共享你的浏览器数据。每一位访问者的个人档案、投递记录和套磁记录都只保存在自己的浏览器中。

源码中包含一份基于穆德帅简历生成的默认示例档案。如果准备把网站作为通用工具公开给其他人，可在 `src/App.tsx` 的 `defaultProfile` 中改成空白示例。

## 后续更新

以后修改网站后，只需把更新后的源码推送到 `main` 分支，GitHub Actions 会自动重新构建和发布，不需要手动替换网页文件。
