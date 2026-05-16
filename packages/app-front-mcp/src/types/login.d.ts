interface LoginParams {
    email: string
    password: string
    captcha?: string
    captchaId?: string
}

interface LoginResponse {
    code: number
    message: string
    data: {
        access_token: string
        refresh_token?: string
        data?: any
        user?: any
    }
}

interface RegisterParams {
    email: string
    password: string
    username: string
    captcha?: string
    captchaId?: string
}

interface RegisterResponse {
    code: number
    message: string
    data: {
        access_token: string
        refresh_token?: string
        data?: any
        user?: any
    }
}

interface GetCaptchaResponse {
    code: number
    message: string
    data: {
        captcha_id: string
        captcha_image: string
    }
}
