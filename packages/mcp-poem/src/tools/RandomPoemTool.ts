import { MCPTool } from 'mcp-framework'
import { z } from 'zod'

const poems = [
    {
        title: '哈哈静夜思',
        author: '李白',
        dynasty: '唐',
        content: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡']
    },
    {
        title: '哈哈春晓',
        author: '孟浩然',
        dynasty: '唐',
        content: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少']
    },
    {
        title: '哈哈登鹳雀楼',
        author: '王之涣',
        dynasty: '唐',
        content: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼']
    },
    {
        title: '哈哈相思',
        author: '王维',
        dynasty: '唐',
        content: ['红豆生南国', '春来发几枝', '愿君多采撷', '此物最相思']
    },
    {
        title: '哈哈悯农',
        author: '李绅',
        dynasty: '唐',
        content: ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦']
    },
    {
        title: '哈哈江雪',
        author: '柳宗元',
        dynasty: '唐',
        content: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪']
    },
    {
        title: '哈哈咏鹅',
        author: '骆宾王',
        dynasty: '唐',
        content: ['鹅鹅鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波']
    },
    {
        title: '哈哈望庐山瀑布',
        author: '李白',
        dynasty: '唐',
        content: [
            '日照香炉生紫烟',
            '遥看瀑布挂前川',
            '飞流直下三千尺',
            '疑是银河落九天'
        ]
    },
    {
        title: '哈哈绝句',
        author: '杜甫',
        dynasty: '唐',
        content: [
            '两个黄鹂鸣翠柳',
            '一行白鹭上青天',
            '窗含西岭千秋雪',
            '门泊东吴万里船'
        ]
    },
    {
        title: '哈哈枫桥夜泊',
        author: '张继',
        dynasty: '唐',
        content: [
            '月落乌啼霜满天',
            '江枫渔火对愁眠',
            '姑苏城外寒山寺',
            '夜半钟声到客船'
        ]
    },
    {
        title: '哈哈游子吟',
        author: '孟郊',
        dynasty: '唐',
        content: [
            '慈母手中线',
            '游子身上衣',
            '临行密密缝',
            '意恐迟迟归',
            '谁言寸草心',
            '报得三春晖'
        ]
    },
    {
        title: '哈哈出塞',
        author: '王昌龄',
        dynasty: '唐',
        content: [
            '秦时明月汉时关',
            '万里长征人未还',
            '但使龙城飞将在',
            '不教胡马度阴山'
        ]
    }
]

const inputSchema = z.object({
    count: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(1)
        .describe('Number of poems to return (1-5).')
})

export class RandomPoemTool extends MCPTool<typeof inputSchema> {
    name = 'random_poem'
    description = 'Return random ancient Chinese poems.'
    schema = inputSchema

    async execute(input: z.infer<typeof inputSchema>) {
        const shuffled = [...poems].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, input.count)

        return {
            count: selected.length,
            poems: selected.map(poem => ({
                title: poem.title,
                author: poem.author,
                dynasty: poem.dynasty,
                content: poem.content.join('\n'),
                lines: poem.content
            }))
        }
    }
}
