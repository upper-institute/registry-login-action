const AWS = require('aws-sdk')

const ECR_LOGIN_GITHUB_ACTION_USER_AGENT = 'amazon-ecr-login-for-github-actions'

export const configure = () => {

    let region = process.env.AWS_REGION || false

    if (region) {
        AWS.config.update({ region })
    }

}

const getECRAuthTokenWrapper = async (authTokenRequest) => {
    const ecr = new AWS.ECR({
        customUserAgent: ECR_LOGIN_GITHUB_ACTION_USER_AGENT
    })

    const authTokenResponse = await ecr.getAuthorizationToken(authTokenRequest).promise()

    if (!authTokenResponse) {
        throw new Error('Amazon ECR authorization token returned no data')
    } else if (!authTokenResponse.authorizationData || !Array.isArray(authTokenResponse.authorizationData)) {
        throw new Error('Amazon ECR authorization token is invalid')
    } else if (!authTokenResponse.authorizationData.length) {
        throw new Error('Amazon ECR authorization token does not contain any authorization data')
    }

    return authTokenResponse
}

export const getECRCredentials = async (registryIds) => {

    const authTokenRequest = {};

    if (registryIds && registryIds.length > 0) {
        authTokenRequest.registryIds = registryIds
    }

    const { authorizationData } = await getECRAuthTokenWrapper(authTokenRequest)

    return authorizationData.map(authData => {
        const authToken = Buffer.from(authData.authorizationToken, 'base64').toString('utf-8')
        const credentials = authToken.split(':', 2)

        return [...credentials, authData.proxyEndpoint]
    })

}