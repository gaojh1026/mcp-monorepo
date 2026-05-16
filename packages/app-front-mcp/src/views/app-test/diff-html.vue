<template>
    <div class="diff-html">
        <div class="diff-container">
            <div class="diff-header">
                <h3>内容差异对比</h3>
            </div>

            <div class="diff-content">
                <div
                    v-for="item in filteredList"
                    :key="item.id"
                    class="diff-item"
                    :class="[`diff-${item.modifyType.toLowerCase()}`, item.section]"
                >
                    <div class="item-header">
                        <span class="item-name">{{ item.name }}</span>
                        <span class="item-type" :class="item.modifyType.toLowerCase()">
                            {{ getModifyTypeText(item.modifyType) }}
                        </span>
                    </div>

                    <div class="item-content">
                        <!-- 修改类型：显示对比 -->
                        <div v-if="item.modifyType === 'MODIFIED'" class="diff-modified">
                            <div class="diff-before">
                                <div class="content-label">修改前：</div>
                                <div class="content-text">
                                    {{ getContentText(item.beforeContent) }}
                                </div>
                            </div>
                            <div class="diff-after">
                                <div class="content-label">修改后：</div>
                                <div class="content-text">
                                    {{ getContentText(item.afterContent) }}
                                </div>
                            </div>
                            <div class="diff-result" v-html="getDiffResult(item)"></div>
                        </div>

                        <!-- 新增类型：显示新增内容 -->
                        <div v-else-if="item.modifyType === 'NEW'" class="diff-new">
                            <div class="content-label">新增内容：</div>
                            <div class="content-text new-content">
                                {{ getContentText(item.afterContent) }}
                            </div>
                        </div>

                        <!-- 删除类型：显示删除内容 -->
                        <div v-else-if="item.modifyType === 'DELETED'" class="diff-deleted">
                            <div class="content-label">删除内容：</div>
                            <div class="content-text deleted-content">
                                {{ getContentText(item.beforeContent) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
// @ts-ignore - htmldiff-js 没有类型声明文件
import HtmlDiff from 'htmldiff-js'

interface ContentItem {
    isCustom: boolean
    value: string
}

interface DiffItem {
    id: string
    type: string
    name: string
    modifyType: 'MODIFIED' | 'NEW' | 'DELETED'
    section: 'mustHave' | 'niceToHave'
    beforeContent: ContentItem[]
    afterContent: ContentItem[]
}

interface Props {
    type?: 'new' | 'modify' | 'delete'
    filterType?: 'all' | 'mustHave' | 'niceToHave'
}

const props = withDefaults(defineProps<Props>(), {
    type: 'new',
    filterType: 'all'
})

const mockList: DiffItem[] = [
    {
        id: 'mh-0002',
        type: 'degree',
        name: '学历',
        modifyType: 'MODIFIED',
        section: 'mustHave',
        beforeContent: [
            {
                isCustom: true,
                value: '本科及以上学历'
            }
        ],
        afterContent: [
            {
                isCustom: true,
                value: '985或211院校本科及以上学历'
            }
        ]
    },
    {
        id: 'mh-0004',
        type: 'workCity',
        name: '工作城市',
        modifyType: 'MODIFIED',
        section: 'mustHave',
        beforeContent: [
            {
                isCustom: true,
                value: '工作城市为北京'
            }
        ],
        afterContent: [
            {
                isCustom: true,
                value: '工作城市为杭州'
            }
        ]
    },
    {
        id: 'nth-0004',
        type: '',
        name: '作品与社区',
        modifyType: 'NEW',
        section: 'niceToHave',
        beforeContent: [],
        afterContent: [
            {
                isCustom: true,
                value: '有技术博客或参与开源项目（GitHub等）者优先'
            }
        ]
    }
]

// 根据类型过滤数据
const filteredList = computed(() => {
    if (props.filterType === 'all') {
        return mockList
    }
    return mockList.filter(item => item.section === props.filterType)
})

// 获取修改类型的文本
const getModifyTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
        MODIFIED: '修改',
        NEW: '新增',
        DELETED: '删除'
    }
    return typeMap[type] || type
}

// 获取内容文本
const getContentText = (content: ContentItem[]) => {
    if (!content || content.length === 0) {
        return ''
    }
    return content.map(item => item.value).join('\n')
}

// 获取HTML差异对比结果
const getDiffResult = (item: DiffItem) => {
    const beforeText = getContentText(item.beforeContent)
    const afterText = getContentText(item.afterContent)

    if (!beforeText && !afterText) {
        return ''
    }

    try {
        const diff = HtmlDiff.execute(beforeText, afterText)
        return diff
    } catch (error) {
        console.error('HTML Diff Error:', error)
        return `<div class="diff-error">对比失败：${error}</div>`
    }
}
</script>

<style lang="less" scoped>
.diff-html {
    padding: 20px;
    background: #f5f5f5;
    min-height: 100vh;
}

.diff-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.diff-header {
    background: #1890ff;
    color: white;
    padding: 16px 20px;

    h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 500;
    }
}

.diff-content {
    padding: 16px;
}

.diff-item {
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    margin-bottom: 16px;
    overflow: hidden;

    &.mustHave {
        border-left: 4px solid #ff4d4f;
    }

    &.niceToHave {
        border-left: 4px solid #52c41a;
    }
}

.item-header {
    background: #fafafa;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e8e8e8;
}

.item-name {
    font-weight: 500;
    font-size: 16px;
    color: #262626;
}

.item-type {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;

    &.modified {
        background: #fff7e6;
        color: #fa8c16;
        border: 1px solid #ffd591;
    }

    &.new {
        background: #f6ffed;
        color: #52c41a;
        border: 1px solid #b7eb8f;
    }

    &.deleted {
        background: #fff2f0;
        color: #ff4d4f;
        border: 1px solid #ffccc7;
    }
}

.item-content {
    padding: 16px;
}

.diff-modified {
    .diff-before,
    .diff-after {
        margin-bottom: 12px;

        .content-label {
            font-weight: 500;
            color: #595959;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .content-text {
            background: #f9f9f9;
            padding: 12px;
            border-radius: 4px;
            border-left: 3px solid #d9d9d9;
            white-space: pre-wrap;
            line-height: 1.5;
        }
    }

    .diff-result {
        background: #fff;
        border: 1px solid #e8e8e8;
        padding: 12px;
        border-radius: 4px;

        // HTML diff样式
        :deep(del) {
            background: #ffebee;
            color: #c62828;
            text-decoration: line-through;
            padding: 2px 4px;
            border-radius: 2px;
        }

        :deep(ins) {
            background: #e8f5e8;
            color: #2e7d32;
            text-decoration: none;
            padding: 2px 4px;
            border-radius: 2px;
        }
    }
}

.diff-new,
.diff-deleted {
    .content-label {
        font-weight: 500;
        color: #595959;
        margin-bottom: 8px;
        font-size: 14px;
    }

    .content-text {
        padding: 12px;
        border-radius: 4px;
        white-space: pre-wrap;
        line-height: 1.5;
    }
}

.diff-new {
    .new-content {
        background: #f6ffed;
        border-left: 3px solid #52c41a;
    }
}

.diff-deleted {
    .deleted-content {
        background: #fff2f0;
        border-left: 3px solid #ff4d4f;
        text-decoration: line-through;
        opacity: 0.8;
    }
}

.diff-error {
    background: #fff2f0;
    color: #ff4d4f;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid #ffccc7;
    font-size: 14px;
}
</style>
