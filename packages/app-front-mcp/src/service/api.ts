import request from './request'

/**
 * 登录
 * @param data
 * @returns
 */
export const loginApi = (data: LoginParams): Promise<LoginResponse> => {
    return request.post('/auths/login', data)
}

/**
 * 用户注册
 * @param data
 * @returns
 */
export const registerApi = (data: RegisterParams): Promise<RegisterResponse> => {
    return request.post('/users/create', data)
}

/**
 * GitHub登录
 * @param data
 * @returns
 */
export const githubLoginApi = (data: { code: string }): Promise<LoginResponse> => {
    return request.post('/auths/github', data)
}

/**
 * 获取GitHubToken
 * @param data
 * @returns
 */
export const getGithubTokenApi = (data: { code: string }): Promise<LoginResponse> => {
    return request.get('/auths/github/token', { params: data })
}

/**
 * 获取GitHub用户信息
 * @param data
 * @returns
 */
export const getGithubUserInfoApi = (data: { code: string }): Promise<LoginResponse> => {
    return request.get('/auths/github/user', { params: data })
}

// 新增：通过 access_token 获取 GitHub 用户信息
export const getGithubUserInfoByTokenApi = (data: {
    access_token: string
}): Promise<LoginResponse> => {
    return request.get('/auths/github/user', { params: data })
}

/**
 * OAuth2应用注册
 * @param data
 * @returns
 */
export const oauth2RegisterApi = (data: Oauth2RegisterParams): Promise<Oauth2RegisterResponse> => {
    return request.post('/oauth2/register', data)
}

/**
 * 获取OAuth2应用列表
 * @returns
 */
export const oauth2ListApi = (): Promise<Oauth2ListResponse> => {
    return request.get('/oauth2/my-apps')
}

/**
 * 校验
 * @param data
 * @returns
 */
export const verifyApi = (data: AuthorizeParams): Promise<AuthorizeResponse> => {
    return request.get('/oauth2/authorize-page', { params: data })
}

/**
 * 获取用户信息
 * @param data
 * @returns
 */
export const generateCodeApi = (data: GenerateCodeParams): Promise<GenerateCodeResponse> => {
    return request.post('/oauth2/authorize', data)
}

/**
 * 获取验证码
 * @param data
 * @returns
 */
export const getCaptchaApi = (): Promise<GetCaptchaResponse> => {
    return request.get('/auths/captcha')
}

/**
 * 获取二维码
 * @param data
 * @returns
 */
export const getQrcodeApi = (): Promise<GetQrcodeResponse> => {
    return request.get('/qrcode/create')
}

/**
 * 获取二维码状态
 * @param data
 * @returns
 */
export const getQrcodeStatusApi = (data: {
    qrcodeId: string
}): Promise<GetQrcodeStatusResponse> => {
    return request.get('/qrcode/getQrcodeStatus', { params: data })
}

/**
 * 更新二维码状态
 * @param data
 * @returns
 */
export const updateQrcodeStatusApi = (data: {
    qrcodeId: string
    status: string
}): Promise<GetQrcodeStatusResponse> => {
    return request.post('/qrcode/updateQrcodeStatus', data)
}

export const confirmLoginApi = (data: {
    qrcodeId: string
    status: string
}): Promise<GetQrcodeStatusResponse> => {
    return request.post('/qrcode/confirmLogin', data)
}

/**
 * 上传大文件分片
 * @param formData 包含 file, fileHash, chunkIndex, totalChunks, filename
 * @returns 分片上传结果
 */
export const uploadChunkApi = (formData: FormData) => {
    return request.post('/file/upload/chunk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}

/**
 * 合并大文件分片
 * @param data 包含 fileHash, filename, totalChunks
 * @returns 合并结果
 */
export const mergeChunksApi = (data: {
    fileHash: string
    filename: string
    totalChunks: number
}) => {
    return request.post('/file/upload/merge', data)
}

/**
 * 检查大文件/分片上传状态
 * @param data 包含 fileHash, filename
 * @returns { uploaded: boolean, uploadedChunks: number[] }
 */
export const checkFileApi = (data: { fileHash: string; filename: string }) => {
    return request.post('/file/upload/check', data)
}

/**
 * 上传单个文件
 * @param data 包含 file
 * @returns
 */
export const uploadFileApi = (data: FormData) => {
    return request.post('/file/upload/fileSingle', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export const getCodeApi = () => {
    return request.get('/oauth2/generate-code')
}
