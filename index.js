const aws = require('./aws')
const exec = require('@actions/exec')
const core = require('@actions/core')

const login = async (client, username, password, registryEndpoint, extraArgs) => {

    let doLoginStdout = ''
    let doLoginStderr = ''

    const exitCode = await exec.exec(client, ['login', '-u', username, '-p', password, registryEndpoint, ...extraArgs], {
        silent: true,
        ignoreReturnCode: true,
        listeners: {
            stdout: (data) => {
                doLoginStdout += data.toString()
            },
            stderr: (data) => {
                doLoginStderr += data.toString()
            }
        }
    })

    if (exitCode !== 0) {
        core.debug(doLoginStdout)
        throw new Error(`Could not login to registry ${registryUri}: ${doLoginStderr}`)
    }
}

async function main() {
    try {

        const driver = core.getInput('driver')
        const client = core.getInput('client')
        const extraAgs = core.getMultilineInput('extraArgs')
        const logout = core.getBooleanInput('logout')

        let credentials = []

        switch (driver) {
            case 'aws.ecr':
            case 'aws.private_ecr':
                aws.configure()

                core.info(`Getting ECR credentials (${driver})`)

                credentials = await aws.getECRCredentials(
                    (process.env.ECR_REGISTRY_IDS || '')
                        .split(',')
                        .map(id => id.trim())
                        .filter(id => id.length)
                )

                break

            default:
                throw new Error(`Invalid driver: ${driver}`)
        }

        const registryUriState = []

        for (const [username, password, registryEndpoint] of credentials) {

            const registryUri = registryEndpoint.replace(/^https?:\/\//, '')

            const index = registryUriState.push(registryUri) - 1

            core.info(`Login registry ${registryUri} (client: ${client})`)

            await login(client, username, password, registryEndpoint, extraAgs)

            core.setOutput(`username_${index}`, username)
            core.maskValue(password)
            core.setOutput(`password_${index}`, password)
            core.setOutput(`registry_endpoint_${index}`, registryEndpoint)
            core.setOutput(`registry_uri_${index}`, registryUri)

        }

        core.info(`Logged in registries`)

        if (registryUriState.length && logout) {
            core.saveState('registries', registryUriState.join())
        }


    } catch (error) {
        core.setFailed(error.message)
    }


}

main().catch(core.setFailed)