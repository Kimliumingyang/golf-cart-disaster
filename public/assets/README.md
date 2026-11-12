# V0.9 素材目录

- ui/: 标志、旗帜、按钮
- characters/: 整人图与可选的肢体贴图
- vehicles/: 车身与独立车轮
- environment/: 远景与大鹅
- effects/: 球、水滴
- originals/: 用户提供的未改动原文件

manifest.json 声明项目素材。游戏优先使用浏览器工作台的本地上传，其次使用此清单；缺失则回退代码绘制。工作台只修改 IndexedDB，不会直接写入静态服务器。要发布给所有玩家，把素材放入本目录并更新 manifest.json 后重新构建。
