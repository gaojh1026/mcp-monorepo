<template>
    <div class="mcp-service-container">
        <a-tabs v-model:activeKey="activeTab" class="mcp-tabs">
            <a-tab-pane key="card" tab="卡片视图">
                <div class="stats-row">
                    <a-card class="stat-card">
                        <a-statistic
                            title="总服务数"
                            :value="stats.total"
                            :value-style="{ color: '#1890ff' }"
                        >
                            <template #prefix>
                                <CloudServerOutlined />
                            </template>
                        </a-statistic>
                    </a-card>
                    <a-card class="stat-card">
                        <a-statistic
                            title="运行中"
                            :value="stats.running"
                            :value-style="{ color: '#52c41a' }"
                        >
                            <template #prefix>
                                <CheckCircleOutlined />
                            </template>
                        </a-statistic>
                    </a-card>
                    <a-card class="stat-card">
                        <a-statistic
                            title="已停止"
                            :value="stats.stopped"
                            :value-style="{ color: '#faad14' }"
                        >
                            <template #prefix>
                                <PauseCircleOutlined />
                            </template>
                        </a-statistic>
                    </a-card>
                    <a-card class="stat-card">
                        <a-statistic
                            title="异常"
                            :value="stats.error"
                            :value-style="{ color: '#ff4d4f' }"
                        >
                            <template #prefix>
                                <ExclamationCircleOutlined />
                            </template>
                        </a-statistic>
                    </a-card>
                </div>
                <a-row :gutter="[16, 16]" class="service-cards">
                    <a-col
                        :xs="24"
                        :sm="12"
                        :md="8"
                        :lg="6"
                        v-for="service in services"
                        :key="service.id"
                    >
                        <a-card hoverable class="service-card" :class="`status-${service.status}`">
                            <template #title>
                                <div class="service-header">
                                    <span class="service-name">{{ service.name }}</span>
                                    <a-tag :color="getStatusColor(service.status)">
                                        {{ getStatusText(service.status) }}
                                    </a-tag>
                                </div>
                            </template>
                            <template #extra>
                                <a-dropdown :trigger="['click']">
                                    <a-button type="text" size="small">
                                        <MoreOutlined />
                                    </a-button>
                                    <template #overlay>
                                        <a-menu @click="handleMenuClick($event, service)">
                                            <a-menu-item
                                                key="start"
                                                :disabled="service.status === 'running'"
                                            >
                                                <PlayCircleOutlined /> 启动
                                            </a-menu-item>
                                            <a-menu-item
                                                key="stop"
                                                :disabled="service.status === 'stopped'"
                                            >
                                                <PauseCircleOutlined /> 停止
                                            </a-menu-item>
                                            <a-menu-divider />
                                            <a-menu-item key="restart">
                                                <ReloadOutlined /> 重启
                                            </a-menu-item>
                                        </a-menu>
                                    </template>
                                </a-dropdown>
                            </template>
                            <div class="service-content">
                                <p class="service-description">{{ service.description }}</p>
                                <div class="service-meta">
                                    <div class="meta-item">
                                        <TagOutlined />
                                        <span>v{{ service.version }}</span>
                                    </div>
                                    <div class="meta-item" v-if="service.port">
                                        <ApiOutlined />
                                        <span>:{{ service.port }}</span>
                                    </div>
                                    <div class="meta-item" v-if="service.author">
                                        <UserOutlined />
                                        <span>{{ service.author }}</span>
                                    </div>
                                </div>
                            </div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-tab-pane>
            <a-tab-pane key="table" tab="表格视图">
                <a-table
                    :dataSource="services"
                    :columns="columns"
                    row-key="id"
                    :pagination="{ pageSize: 10 }"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                            <a-tag :color="getStatusColor(record.status)">
                                {{ getStatusText(record.status) }}
                            </a-tag>
                        </template>
                        <template v-else-if="column.key === 'action'">
                            <a-space>
                                <a-button
                                    type="primary"
                                    size="small"
                                    :disabled="record.status === 'running'"
                                    @click="handleAction('start', record)"
                                >
                                    <PlayCircleOutlined /> 启动
                                </a-button>
                                <a-button
                                    type="default"
                                    size="small"
                                    :disabled="record.status === 'stopped'"
                                    @click="handleAction('stop', record)"
                                >
                                    <PauseCircleOutlined /> 停止
                                </a-button>
                                <a-button
                                    type="link"
                                    size="small"
                                    @click="handleAction('restart', record)"
                                >
                                    <ReloadOutlined /> 重启
                                </a-button>
                            </a-space>
                        </template>
                    </template>
                </a-table>
            </a-tab-pane>
        </a-tabs>
        <a-modal
            v-model:open="modalVisible"
            :title="modalTitle"
            @ok="handleModalOk"
            @cancel="modalVisible = false"
        >
            <div class="modal-content">
                <p>{{ modalContent }}</p>
            </div>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { McpService, ServiceStats } from './types'
import { mcpServices } from './data'
import {
    CloudServerOutlined,
    CheckCircleOutlined,
    PauseCircleOutlined,
    ExclamationCircleOutlined,
    MoreOutlined,
    PlayCircleOutlined,
    ReloadOutlined,
    TagOutlined,
    ApiOutlined,
    UserOutlined
} from '@ant-design/icons-vue'

const activeTab = ref('card')
const services = ref<McpService[]>(mcpServices)
const modalVisible = ref(false)
const modalTitle = ref('')
const modalContent = ref('')
const currentAction = ref<{ key: string; service: McpService } | null>(null)

const columns = [
    {
        title: '服务名称',
        dataIndex: 'name',
        key: 'name'
    },
    {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true
    },
    {
        title: '版本',
        dataIndex: 'version',
        key: 'version',
        width: 100
    },
    {
        title: '状态',
        key: 'status',
        width: 100
    },
    {
        title: '操作',
        key: 'action',
        width: 200
    }
]

const stats = computed<ServiceStats>(() => ({
    total: services.value.length,
    running: services.value.filter(s => s.status === 'running').length,
    stopped: services.value.filter(s => s.status === 'stopped').length,
    error: services.value.filter(s => s.status === 'error').length
}))

const getStatusColor = (status: McpService['status']) => {
    const colors = {
        running: 'green',
        stopped: 'gold',
        error: 'red'
    }
    return colors[status]
}

const getStatusText = (status: McpService['status']) => {
    const texts = {
        running: '运行中',
        stopped: '已停止',
        error: '异常'
    }
    return texts[status]
}

const handleMenuClick = (e: any, service: McpService) => {
    handleAction(e.key, service)
}

const handleAction = (key: string, service: McpService) => {
    currentAction.value = { key, service }
    const actionTexts: Record<string, string> = {
        start: '启动',
        stop: '停止',
        restart: '重启'
    }
    modalTitle.value = `${actionTexts[key]} ${service.name}`
    modalContent.value = `确定要${actionTexts[key]} ${service.name} 服务吗？`
    modalVisible.value = true
}

const handleModalOk = () => {
    if (currentAction.value) {
        const { key, service } = currentAction.value
        const serviceIndex = services.value.findIndex(s => s.id === service.id)
        if (serviceIndex !== -1) {
            if (key === 'start') {
                services.value[serviceIndex].status = 'running'
            } else if (key === 'stop') {
                services.value[serviceIndex].status = 'stopped'
            } else if (key === 'restart') {
                services.value[serviceIndex].status = 'running'
            }
        }
    }
    modalVisible.value = false
}
</script>

<style scoped>
.mcp-service-container {
    padding: 24px;
}

.mcp-tabs :deep(.ant-tabs-nav) {
    margin-bottom: 24px;
}

.stats-row {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
}

.stat-card {
    flex: 1;
    min-width: 150px;
}

.service-cards {
    margin-top: 16px;
}

.service-card {
    height: 100%;
    transition: all 0.3s;
}

.service-card.status-running {
    border-left: 3px solid #52c41a;
}

.service-card.status-stopped {
    border-left: 3px solid #faad14;
}

.service-card.status-error {
    border-left: 3px solid #ff4d4f;
}

.service-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.service-name {
    font-weight: 600;
    font-size: 16px;
}

.service-content {
    min-height: 80px;
}

.service-description {
    color: #666;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 12px;
}

.service-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #999;
}

.modal-content {
    padding: 16px 0;
}
</style>
