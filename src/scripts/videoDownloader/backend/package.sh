# !/bin/bash
# 打包出的可执行文件体积超大
python -m PyInstaller --noconfirm --clean --onefile --name video-downloader-backend app/main.py