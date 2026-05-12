/**
 * GitHub Device Code Flow 实现
 * 参考: https://docs.github.com/en/developers/apps/authorizing-oauth-apps#device-flow
 */

export type DeviceCodeResponse = {
    device_code: string
    user_code: string
    verification_uri: string
    expires_in: number
    interval: number
}

export type DeviceTokenResponse = {
    access_token: string
    token_type: string
    scope: string
} | {
    error: string
    error_description: string
}

/**
 * 请求 GitHub Device Code
 */
export async function requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
    const body = new URLSearchParams({
        client_id: clientId,
        scope: 'read:user'
    })

    const res = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    })

    if (!res.ok) {
        throw new Error(`Device code 请求失败: HTTP ${res.status}`)
    }

    const json = await res.json() as DeviceCodeResponse & { error?: string; error_description?: string }
    if (json.error) {
        throw new Error(json.error_description ?? json.error)
    }

    return json
}

/**
 * 轮询检查 token 是否已授权
 * @param clientId GitHub OAuth App Client ID
 * @param deviceCode 设备代码
 * @param interval 轮询间隔（秒）
 * @param onPoll 每次轮询的回调，可用于显示状态
 */
export async function pollForToken(
    clientId: string,
    deviceCode: string,
    interval: number,
    onPoll?: (remaining: number) => void
): Promise<DeviceTokenResponse> {
    const body = new URLSearchParams({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    })

    while (true) {
        // 等待 interval 秒
        await new Promise(resolve => setTimeout(resolve, interval * 1000))
        onPoll?.(interval)

        const res = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
        })

        if (!res.ok) {
            throw new Error(`Token 请求失败: HTTP ${res.status}`)
        }

        const json = await res.json() as DeviceTokenResponse

        // 检查是否完成授权
        if ('access_token' in json) {
            return json
        }

        // 检查错误类型
        if ('error' in json) {
            if (json.error === 'authorization_pending') {
                // 继续轮询
                continue
            } else if (json.error === 'slow_down') {
                // 增加间隔
                continue
            } else if (json.error === 'expired_token') {
                throw new Error('设备代码已过期，请重新发起登录')
            } else if (json.error === 'incorrect_device_code') {
                throw new Error('设备代码无效')
            } else {
                throw new Error(json.error_description ?? json.error)
            }
        }
    }
}
