const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');

class WebMToMP4Converter {
    constructor() {
        this.inputDir = './input';
        this.outputDir = './output';
        this.supportedFormats = ['.webm', '.mkv', '.avi', '.mov', '.flv'];
    }

    // 检查FFmpeg是否已安装
    async checkFFmpeg() {
        return new Promise((resolve) => {
            ffmpeg.getAvailableCodecs((err, codecs) => {
                if (err) {
                    console.error('❌ FFmpeg未安装或无法访问');
                    console.log('请安装FFmpeg: https://ffmpeg.org/download.html');
                    resolve(false);
                } else {
                    console.log('✅ FFmpeg已安装');
                    resolve(true);
                }
            });
        });
    }

    // 创建必要的目录
    async createDirectories() {
        try {
            await fs.ensureDir(this.inputDir);
            await fs.ensureDir(this.outputDir);
            console.log('✅ 目录创建完成');
        } catch (error) {
            console.error('❌ 创建目录失败:', error.message);
        }
    }

    // 获取输入文件列表
    async getInputFiles() {
        try {
            const files = await fs.readdir(this.inputDir);
            return files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return this.supportedFormats.includes(ext);
            });
        } catch (error) {
            console.error('❌ 读取输入目录失败:', error.message);
            return [];
        }
    }

    // 转换单个文件
    async convertFile(inputFile) {
        const inputPath = path.join(this.inputDir, inputFile);
        const outputFileName = path.parse(inputFile).name + '.mp4';
        const outputPath = path.join(this.outputDir, outputFileName);

        return new Promise((resolve, reject) => {
            console.log(`🔄 正在转换: ${inputFile} -> ${outputFileName}`);

            ffmpeg(inputPath)
                .outputOptions([
                    '-c:v libx264',        // 视频编码器
                    '-c:a aac',            // 音频编码器
                    '-preset medium',       // 编码预设
                    '-crf 23',             // 质量设置
                    '-movflags +faststart' // 优化网络播放
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log(`📝 执行命令: ${commandLine}`);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`📊 进度: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log(`✅ 转换完成: ${outputFileName}`);
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error(`❌ 转换失败: ${inputFile}`, err.message);
                    reject(err);
                })
                .run();
        });
    }

    // 批量转换文件
    async convertAll() {
        console.log('🚀 开始批量转换...');
        
        const files = await this.getInputFiles();
        
        if (files.length === 0) {
            console.log('⚠️  没有找到可转换的文件');
            console.log(`请将WebM文件放入 ${this.inputDir} 目录`);
            return;
        }

        console.log(`📁 找到 ${files.length} 个文件需要转换:`);
        files.forEach(file => console.log(`  - ${file}`));

        const results = {
            success: [],
            failed: []
        };

        for (const file of files) {
            try {
                const outputPath = await this.convertFile(file);
                results.success.push({ input: file, output: outputPath });
            } catch (error) {
                results.failed.push({ input: file, error: error.message });
            }
        }

        // 显示转换结果
        console.log('\n📋 转换结果:');
        console.log(`✅ 成功: ${results.success.length} 个文件`);
        console.log(`❌ 失败: ${results.failed.length} 个文件`);

        if (results.failed.length > 0) {
            console.log('\n❌ 失败的文件:');
            results.failed.forEach(item => {
                console.log(`  - ${item.input}: ${item.error}`);
            });
        }
    }

    // 主函数
    async run() {
        console.log('🎬 WebM to MP4 转换器');
        console.log('=' .repeat(40));

        // 检查FFmpeg
        const ffmpegAvailable = await this.checkFFmpeg();
        if (!ffmpegAvailable) {
            return;
        }

        // 创建目录
        await this.createDirectories();

        // 开始转换
        await this.convertAll();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const converter = new WebMToMP4Converter();
    converter.run().catch(console.error);
}

module.exports = WebMToMP4Converter;
