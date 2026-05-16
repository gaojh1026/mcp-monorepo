<template>
    <!-- 应用备案注册页 -->
    <div class="app-register-page">
        <div class="register-container">
            <div class="register-header">
                <h1>OAuth2.0 应用注册</h1>
                <p>请填写以下信息完成应用备案注册</p>
            </div>

            <a-form
                ref="formRef"
                :model="formData"
                :rules="formRules"
                :label-col="{ span: 6 }"
                :wrapper-col="{ span: 18 }"
                class="register-form"
            >
                <a-form-item label="应用名称" name="app_name">
                    <a-input
                        v-model:value="formData.app_name"
                        placeholder="请输入应用名称"
                        :maxlength="100"
                        show-count
                    />
                </a-form-item>

                <a-form-item label="回调地址" name="redirect_uris">
                    <a-textarea
                        v-model:value="formData.redirect_uris"
                        :rows="3"
                        placeholder="请输入回调地址，多个地址用逗号分隔"
                        :maxlength="500"
                        show-count
                    />
                    <div class="form-tip">
                        多个回调地址请用英文逗号分隔，例如：https://example.com/callback,https://app.example.com/auth
                    </div>
                </a-form-item>

                <a-form-item label="应用所有者" name="owner_id">
                    {{ authStore?.user?.username }}&nbsp;&nbsp;{{ authStore?.user?.email }}
                    <!-- <a-input-number
            v-model:value="formData.owner_id"
            :min="1"
            placeholder="请输入应用所有者ID"
            style="width: 100%"
            :disabled="true"
          /> -->
                </a-form-item>

                <a-form-item label="允许的Scope" name="scope">
                    <a-input
                        v-model:value="formData.scope"
                        placeholder="请输入允许的scope，多个用空格分隔"
                        :maxlength="500"
                        show-count
                    />
                    <div class="form-tip">例如：read write admin，多个scope用空格分隔</div>
                </a-form-item>

                <a-form-item label="应用描述" name="description">
                    <a-textarea
                        v-model:value="formData.description"
                        :rows="3"
                        placeholder="请输入应用描述"
                        :maxlength="500"
                        show-count
                    />
                </a-form-item>

                <a-form-item label="应用主页" name="homepage_url">
                    <a-input
                        v-model:value="formData.homepage_url"
                        placeholder="请输入应用主页URL"
                        :maxlength="255"
                        show-count
                    />
                    <div class="form-tip">例如：https://example.com</div>
                </a-form-item>

                <a-form-item label="应用图标URL" name="icon_url">
                    <a-input
                        v-model:value="formData.icon_url"
                        placeholder="请输入应用图标URL"
                        :maxlength="255"
                        show-count
                    />
                    <div class="form-tip">例如：https://example.com/icon.png</div>
                </a-form-item>

                <a-form-item label="应用版本" name="version">
                    <a-input
                        v-model:value="formData.version"
                        placeholder="请输入应用版本号"
                        :maxlength="100"
                        show-count
                    />
                    <div class="form-tip">例如：1.0.0</div>
                </a-form-item>

                <a-form-item label="OIDC支持" name="support_oidc">
                    <a-radio-group v-model:value="formData.support_oidc">
                        <a-radio :value="1">支持</a-radio>
                        <a-radio :value="0">不支持</a-radio>
                    </a-radio-group>
                    <div class="form-tip">OpenID Connect 支持，用于身份认证</div>
                </a-form-item>

                <a-form-item label="访问令牌有效期" name="access_token_expires_in">
                    <a-input-number
                        v-model:value="formData.access_token_expires_in"
                        :min="60"
                        :max="86400"
                        placeholder="请输入访问令牌有效期（秒）"
                        style="width: 100%"
                    />
                    <div class="form-tip">默认3600秒（1小时），范围：60-86400秒</div>
                </a-form-item>

                <a-form-item label="刷新令牌有效期" name="refresh_token_expires_in">
                    <a-input-number
                        v-model:value="formData.refresh_token_expires_in"
                        :min="3600"
                        :max="31536000"
                        placeholder="请输入刷新令牌有效期（秒）"
                        style="width: 100%"
                    />
                    <div class="form-tip">默认2592000秒（30天），范围：3600-31536000秒</div>
                </a-form-item>

                <a-form-item label="应用状态" name="status">
                    <a-radio-group v-model:value="formData.status">
                        <a-radio :value="1">启用</a-radio>
                        <a-radio :value="0">禁用</a-radio>
                    </a-radio-group>
                </a-form-item>

                <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
                    <a-button type="primary" @click="handleSubmit" :loading="loading">
                        提交注册
                    </a-button>
                    <a-button @click="handleReset" style="margin-left: 8px">重置</a-button>
                </a-form-item>
            </a-form>

            <!-- 应用列表展示 -->
            <div class="app-list-section">
                <div class="section-header">
                    <h2>我的应用</h2>
                    <a-button type="primary" @click="refreshAppList" :loading="listLoading">
                        刷新列表
                    </a-button>
                </div>

                <a-table
                    :columns="columns"
                    :data-source="paginatedAppList"
                    :loading="listLoading"
                    :pagination="pagination"
                    row-key="id"
                    class="app-table"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                            <a-tag :color="record.status === 1 ? 'green' : 'red'">
                                {{ record.status === 1 ? '启用' : '禁用' }}
                            </a-tag>
                        </template>
                        <template v-else-if="column.key === 'client_id'">
                            <a-tag color="blue">{{ record.client_id }}</a-tag>
                        </template>
                        <template v-else-if="column.key === 'version'">
                            <span>{{ record.version || '-' }}</span>
                        </template>
                        <template v-else-if="column.key === 'support_oidc'">
                            <a-tag :color="record.support_oidc === 1 ? 'green' : 'red'">
                                {{ record.support_oidc === 1 ? '支持' : '不支持' }}
                            </a-tag>
                        </template>
                        <template v-else-if="column.key === 'created_at'">
                            {{ formatDate(record.created_at) }}
                        </template>
                        <template v-else-if="column.key === 'action'">
                            <a-space>
                                <a-button type="link" size="small" @click="viewAppDetail(record)">
                                    查看详情
                                </a-button>
                                <a-button type="link" size="small" @click="editApp(record)">
                                    编辑
                                </a-button>
                            </a-space>
                        </template>
                    </template>
                </a-table>
            </div>

            <!-- 注册成功后的结果展示 -->
            <a-modal
                v-model:open="showResult"
                title="注册成功"
                width="600px"
                :closable="false"
                :footer="null"
            >
                <div class="result-content">
                    <a-alert message="应用注册成功！" type="success" :closable="false" show-icon />

                    <div class="result-info">
                        <h3>应用信息</h3>
                        <a-descriptions :column="1" bordered>
                            <a-descriptions-item label="应用名称">
                                {{ resultData.app_name }}
                            </a-descriptions-item>
                            <a-descriptions-item label="应用ID (Client ID)">
                                <a-tag color="blue">{{ resultData.client_id }}</a-tag>
                            </a-descriptions-item>
                            <a-descriptions-item label="应用密钥 (Client Secret)">
                                <a-tag color="orange">{{ resultData.client_secret }}</a-tag>
                                <a-button
                                    type="link"
                                    size="small"
                                    @click="copyToClipboard(resultData.client_secret)"
                                >
                                    复制
                                </a-button>
                            </a-descriptions-item>
                            <a-descriptions-item label="回调地址">
                                {{ resultData.redirect_uris }}
                            </a-descriptions-item>
                            <a-descriptions-item label="允许的Scope">
                                {{ resultData.scope || '-' }}
                            </a-descriptions-item>
                            <a-descriptions-item label="应用描述">
                                {{ resultData.description || '-' }}
                            </a-descriptions-item>
                            <a-descriptions-item label="应用主页">
                                <a
                                    :href="resultData.homepage_url"
                                    target="_blank"
                                    v-if="resultData.homepage_url"
                                >
                                    {{ resultData.homepage_url }}
                                </a>
                                <span v-else>-</span>
                            </a-descriptions-item>
                            <a-descriptions-item label="应用图标URL">
                                <a
                                    :href="resultData.icon_url"
                                    target="_blank"
                                    v-if="resultData.icon_url"
                                >
                                    {{ resultData.icon_url }}
                                </a>
                                <span v-else>-</span>
                            </a-descriptions-item>
                            <a-descriptions-item label="应用版本">
                                {{ resultData.version || '-' }}
                            </a-descriptions-item>
                            <a-descriptions-item label="OIDC支持">
                                <a-tag :color="resultData.support_oidc === 1 ? 'green' : 'red'">
                                    {{ resultData.support_oidc === 1 ? '支持' : '不支持' }}
                                </a-tag>
                            </a-descriptions-item>
                            <a-descriptions-item label="访问令牌有效期">
                                {{ resultData.access_token_expires_in || 3600 }} 秒
                            </a-descriptions-item>
                            <a-descriptions-item label="刷新令牌有效期">
                                {{ resultData.refresh_token_expires_in || 2592000 }} 秒
                            </a-descriptions-item>
                            <a-descriptions-item label="创建时间">
                                {{ formatDate(resultData.created_at) }}
                            </a-descriptions-item>
                        </a-descriptions>
                    </div>

                    <div class="result-tips">
                        <a-alert message="重要提示" type="warning" :closable="false" show-icon>
                            <template #description>
                                <p>1. 请妥善保管您的 Client Secret，它不会再次显示</p>
                                <p>2. 请将 Client ID 和 Client Secret 安全地集成到您的应用中</p>
                                <p>3. 如需修改应用信息，请联系管理员</p>
                            </template>
                        </a-alert>
                    </div>
                </div>

                <template #footer>
                    <a-button @click="showResult = false">关闭</a-button>
                    <a-button type="primary" @click="handleComplete" style="margin-left: 8px"
                        >完成</a-button
                    >
                </template>
            </a-modal>

            <!-- 应用详情弹窗 -->
            <a-modal v-model:open="showDetail" title="应用详情" width="700px" :footer="null">
                <div class="detail-content">
                    <a-descriptions :column="1" bordered>
                        <a-descriptions-item label="应用名称">
                            {{ currentApp.app_name }}
                        </a-descriptions-item>
                        <a-descriptions-item label="应用ID (Client ID)">
                            <a-tag color="blue">{{ currentApp.client_id }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="应用密钥 (Client Secret)">
                            <a-tag color="orange">{{ currentApp.client_secret }}</a-tag>
                            <a-button
                                type="link"
                                size="small"
                                @click="copyToClipboard(currentApp.client_secret)"
                            >
                                复制
                            </a-button>
                        </a-descriptions-item>
                        <a-descriptions-item label="回调地址">
                            {{ currentApp.redirect_uris }}
                        </a-descriptions-item>
                        <a-descriptions-item label="允许的Scope">
                            {{ currentApp.scope || '-' }}
                        </a-descriptions-item>
                        <a-descriptions-item label="应用描述">
                            {{ currentApp.description || '-' }}
                        </a-descriptions-item>
                        <a-descriptions-item label="应用主页">
                            <a
                                :href="currentApp.homepage_url"
                                target="_blank"
                                v-if="currentApp.homepage_url"
                            >
                                {{ currentApp.homepage_url }}
                            </a>
                            <span v-else>-</span>
                        </a-descriptions-item>
                        <a-descriptions-item label="应用图标URL">
                            <a
                                :href="currentApp.icon_url"
                                target="_blank"
                                v-if="currentApp.icon_url"
                            >
                                {{ currentApp.icon_url }}
                            </a>
                            <span v-else>-</span>
                        </a-descriptions-item>
                        <a-descriptions-item label="应用版本">
                            {{ currentApp.version || '-' }}
                        </a-descriptions-item>
                        <a-descriptions-item label="OIDC支持">
                            <a-tag :color="currentApp.support_oidc === 1 ? 'green' : 'red'">
                                {{ currentApp.support_oidc === 1 ? '支持' : '不支持' }}
                            </a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="访问令牌有效期">
                            {{ currentApp.access_token_expires_in || 3600 }} 秒
                        </a-descriptions-item>
                        <a-descriptions-item label="刷新令牌有效期">
                            {{ currentApp.refresh_token_expires_in || 2592000 }} 秒
                        </a-descriptions-item>
                        <a-descriptions-item label="应用状态">
                            <a-tag :color="currentApp.status === 1 ? 'green' : 'red'">
                                {{ currentApp.status === 1 ? '启用' : '禁用' }}
                            </a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="最后使用时间">
                            {{
                                currentApp.last_used_at ? formatDate(currentApp.last_used_at) : '-'
                            }}
                        </a-descriptions-item>
                        <a-descriptions-item label="创建时间">
                            {{ formatDate(currentApp.created_at) }}
                        </a-descriptions-item>
                        <a-descriptions-item label="更新时间">
                            {{ formatDate(currentApp.updated_at) }}
                        </a-descriptions-item>
                    </a-descriptions>
                </div>
            </a-modal>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { oauth2RegisterApi, oauth2ListApi, getCodeApi } from '@/service/api'

import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
console.log(authStore.user)

// 表单引用
const formRef = ref<FormInstance>()

// 加载状态
const loading = ref(false)
const listLoading = ref(false)

// 显示结果弹窗
const showResult = ref(false)
const showDetail = ref(false)

// 结果数据
const resultData = ref<any>({})

// 应用列表数据
const appList = ref<any[]>([])
const currentApp = ref<any>({})

// 分页配置
const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) =>
        `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
    onChange: (page: number, pageSize: number) => {
        pagination.current = page
        pagination.pageSize = pageSize
    }
})

// 计算分页后的数据
const paginatedAppList = computed(() => {
    const start = (pagination.current - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    return appList.value.slice(start, end)
})

// 表格列配置
const columns = [
    {
        title: '应用名称',
        dataIndex: 'app_name',
        key: 'app_name',
        width: 150
    },
    {
        title: 'Client ID',
        dataIndex: 'client_id',
        key: 'client_id',
        width: 200
    },
    {
        title: '应用版本',
        dataIndex: 'version',
        key: 'version',
        width: 100
    },
    {
        title: 'OIDC支持',
        dataIndex: 'support_oidc',
        key: 'support_oidc',
        width: 100
    },
    {
        title: '回调地址',
        dataIndex: 'redirect_uris',
        key: 'redirect_uris',
        ellipsis: true
    },
    {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 80
    },
    {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 120
    },
    {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right'
    }
]

// 表单数据
const formData = reactive({
    app_name: '',
    redirect_uris: '',
    // owner_id: undefined as number | undefined,
    owner_id: authStore?.user?.id,
    scope: '',
    description: '',
    homepage_url: '',
    icon_url: '',
    version: '',
    support_oidc: 0,
    access_token_expires_in: 3600,
    refresh_token_expires_in: 2592000,
    status: 1
})

// 表单验证规则
const formRules: Record<string, Rule[]> = {
    app_name: [
        { required: true, message: '请输入应用名称', trigger: 'blur' },
        { min: 1, max: 100, message: '应用名称长度在 1 到 100 个字符', trigger: 'blur' }
    ],
    redirect_uris: [
        { required: true, message: '请输入回调地址', trigger: 'blur' },
        {
            validator: (_: any, value: string, callback: any) => {
                if (!value) {
                    callback(new Error('请输入回调地址'))
                    return
                }

                const urls = value
                    .split(',')
                    .map((url: string) => url.trim())
                    .filter((url: string) => url)
                if (urls.length === 0) {
                    callback(new Error('请输入有效的回调地址'))
                    return
                }

                const urlPattern = /^https?:\/\/.+/i
                for (const url of urls) {
                    if (!urlPattern.test(url)) {
                        callback(new Error('回调地址必须以 http:// 或 https:// 开头'))
                        return
                    }
                }

                callback()
            },
            trigger: 'blur'
        }
    ],
    owner_id: [
        { required: true, message: '请输入应用所有者ID', trigger: 'blur' },
        { type: 'number', min: 1, message: '所有者ID必须大于0', trigger: 'blur' }
    ],
    scope: [{ max: 500, message: 'Scope长度不能超过500个字符', trigger: 'blur' }],
    description: [{ max: 500, message: '应用描述长度不能超过500个字符', trigger: 'blur' }],
    homepage_url: [
        {
            validator: (_: any, value: string, callback: any) => {
                if (value && !/^https?:\/\/.+/i.test(value)) {
                    callback(new Error('主页URL必须以 http:// 或 https:// 开头'))
                    return
                }
                callback()
            },
            trigger: 'blur'
        }
    ],
    icon_url: [
        {
            validator: (_: any, value: string, callback: any) => {
                if (value && !/^https?:\/\/.+/i.test(value)) {
                    callback(new Error('图标URL必须以 http:// 或 https:// 开头'))
                    return
                }
                callback()
            },
            trigger: 'blur'
        }
    ],
    version: [{ max: 100, message: '应用版本号长度不能超过100个字符', trigger: 'blur' }],
    access_token_expires_in: [
        { required: true, message: '请输入访问令牌有效期', trigger: 'blur' },
        {
            type: 'number',
            min: 60,
            max: 86400,
            message: '访问令牌有效期必须在60到86400秒之间',
            trigger: 'blur'
        }
    ],
    refresh_token_expires_in: [
        { required: true, message: '请输入刷新令牌有效期', trigger: 'blur' },
        {
            type: 'number',
            min: 3600,
            max: 31536000,
            message: '刷新令牌有效期必须在3600到31536000秒之间',
            trigger: 'blur'
        }
    ]
}

// 提交表单
const handleSubmit = async () => {
    if (!formRef.value) return

    try {
        await formRef.value.validate()

        // 确保owner_id不为undefined
        if (!formData.owner_id) {
            message.error('请输入应用所有者ID')
            return
        }

        loading.value = true

        const {
            code,
            data,
            message: msg
        } = await oauth2RegisterApi({
            ...formData,
            owner_id: formData.owner_id
        })

        if (code === 0) {
            resultData.value = data
            showResult.value = true
            message.success('应用注册成功！')
            // 注册成功后刷新列表
            getOauth2List()
        } else {
            message.error(msg || '注册失败')
        }
    } catch (error: any) {
        console.error('注册失败:', error)
        message.error(error.response?.data?.message || '注册失败，请重试')
    } finally {
        loading.value = false
    }
}

// 重置表单
const handleReset = () => {
    if (!formRef.value) return

    Modal.confirm({
        title: '提示',
        content: '确定要重置表单吗？',
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
            formRef.value?.resetFields()
            // 重置为默认值
            Object.assign(formData, {
                app_name: '',
                redirect_uris: '',
                owner_id: authStore?.user?.id,
                scope: '',
                description: '',
                homepage_url: '',
                icon_url: '',
                version: '',
                support_oidc: 0,
                access_token_expires_in: 3600,
                refresh_token_expires_in: 2592000,
                status: 1
            })
            message.success('表单已重置')
        }
    })
}

// 完成注册
const handleComplete = () => {
    showResult.value = false
    // 可以在这里跳转到应用列表页面
    // router.push('/app-list')
}

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text)
        message.success('已复制到剪贴板')
    } catch (error) {
        message.error('复制失败')
    }
}

// 格式化日期
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
}

// 获取应用列表
const getOauth2List = async () => {
    try {
        listLoading.value = true
        const { code, data } = await oauth2ListApi()

        if (code === 0) {
            appList.value = data.list || []
            pagination.total = data.total || appList.value.length
        } else {
            message.error('获取应用列表失败')
        }
    } catch (error: any) {
        console.error('获取应用列表失败:', error)
        message.error('获取应用列表失败，请重试')
    } finally {
        listLoading.value = false
    }
}

// 刷新应用列表
const refreshAppList = () => {
    getOauth2List()
    getCodeApi()
}

// 查看应用详情
const viewAppDetail = (record: any) => {
    currentApp.value = { ...record }
    showDetail.value = true
}

// 编辑应用
const editApp = (record: any) => {
    message.info('编辑功能开发中...')
    console.log('编辑应用:', record)
}

onMounted(() => {
    getOauth2List()
})
</script>

<style lang="less" scoped>
.app-register-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.register-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    padding: 40px;
    width: 100%;
    max-width: 1200px;
}

.register-header {
    text-align: center;
    margin-bottom: 40px;

    h1 {
        color: #333;
        font-size: 28px;
        font-weight: 600;
        margin-bottom: 8px;
    }

    p {
        color: #666;
        font-size: 16px;
        margin: 0;
    }
}

.register-form {
    .form-tip {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
        line-height: 1.4;
    }
}

.app-list-section {
    margin-top: 60px;
    border-top: 1px solid #f0f0f0;
    padding-top: 40px;

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;

        h2 {
            color: #333;
            font-size: 20px;
            font-weight: 600;
            margin: 0;
        }
    }

    .app-table {
        :deep(.ant-table-thead > tr > th) {
            background-color: #fafafa;
            font-weight: 500;
        }
    }
}

.result-content {
    .result-info {
        margin: 20px 0;

        h3 {
            margin-bottom: 16px;
            color: #333;
        }
    }

    .result-tips {
        margin-top: 20px;
    }
}

.detail-content {
    :deep(.ant-descriptions-item-label) {
        font-weight: 500;
        color: #333;
    }
}

:deep(.ant-form-item-label > label) {
    font-weight: 500;
    color: #333;
}

:deep(.ant-input) {
    border-radius: 8px;
}

:deep(.ant-btn) {
    border-radius: 8px;
    padding: 4px 16px;
    font-weight: 500;
}

:deep(.ant-input-number) {
    .ant-input {
        border-radius: 8px;
    }
}

:deep(.ant-table) {
    border-radius: 8px;
    overflow: hidden;
}
</style>
