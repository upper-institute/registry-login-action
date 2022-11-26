const exec = require('@actions/exec')
const core = require('@actions/core')

const logout = async (client, registry) => {

    let doLogoutStdout = ''
    let doLogoutStderr = ''

    const exitCode = await exec.exec(client, ['logout', registry], {
        silent: true,
        ignoreReturnCode: true,
        listeners: {
            stdout: (data) => {
                doLogoutStdout += data.toString()
            },
            stderr: (data) => {
                doLogoutStderr += data.toString()
            }
        }
    })

    if (exitCode !== 0) {
        core.debug(doLogoutStdout)
        core.error(`Could not logout of registry ${registry}: ${doLogoutStderr}`)
    }

}

async function cleanup() {
    try {

        const registriesState = core.getState('registries')

        if (registriesState) {
            
            const client = core.getInput('client')

            const registries = registriesState.split(',')

            for (const registry of registries) {
                core.info(`Logging out of registry ${registry}`)

                await logout(client, registry)

            }

        }

    } catch (error) {
        core.setFailed(error.message)
    }
}

cleanup().catch(core.setFailed)