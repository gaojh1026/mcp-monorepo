interface Oauth2RegisterParams {
    app_name: string
    redirect_uris: string
    owner_id: number
    scope?: string
    description?: string
    homepage_url?: string
    status?: number
}

interface Oauth2RegisterResponse {
    code: number
    message: string
    data: {
        id: number
        app_name: string
        client_id: string
        client_secret: string
        redirect_uris: string
        owner_id: number
        scope?: string
        description?: string
        homepage_url?: string
        status: number
        created_at: string
        updated_at: string
    }
}

interface Oauth2ListResponse {
    code: number
    message: string
    data: any
}

interface AuthorizeParams {
    client_id: string
    redirect_url: string
    scope: string
    state: string
}

interface AuthorizeResponse {
    code: number
    message: string
    data: {
        app_name: string
        description: string
        homepage_url: string
        scope: string
        state: string
        client_id: string
        redirect_url: string
    }
}

interface GenerateCodeParams {
    client_id: string
    redirect_url: string
    scope: string
    state: string
}

interface GenerateCodeResponse {
    code: number
    message: string
    data: {
        redirect_url: string
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

interface GetQrcodeResponse {
    code: number
    message: string
    data: {
        qrcodeId: string
        qrcodeUrl: string
    }
}

interface GetQrcodeStatusResponse {
    code: number
    message: string
    data: {
        status: QRCodeStatus
    }
}
