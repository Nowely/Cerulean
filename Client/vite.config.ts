import {fileURLToPath, URL} from 'node:url';

import {defineConfig} from 'vite';
import plugin from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import {env} from 'process';

const https = getHttpsConfig()

const target = env.ASPNETCORE_HTTPS_PORT ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}` :
	env.ASPNETCORE_URLS ? env.ASPNETCORE_URLS.split(';')[0] : 'https://localhost:7095';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [plugin()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	server: {
		proxy: {
			'^/weatherforecast': {
				target,
				secure: false
			}
		},
		port: env.PORT ?? 5173,
		https
	}
})


function getHttpsConfig() {
	const baseFolder =
		env.APPDATA !== undefined && env.APPDATA !== ''
			? `${env.APPDATA}/ASP.NET/https`
			: `${env.HOME}/.aspnet/https`;

	const certificateArg = process.argv.map(arg => arg.match(/--name=(?<value>.+)/i)).filter(Boolean)[0];
	const certificateName = certificateArg ? certificateArg.groups.value : "Client";

	if (!certificateName) {
		console.error('Invalid certificate name. Run this script in the context of an npm/yarn script or pass --name=<<app>> explicitly.')
		process.exit(-1);
	}

	const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
	const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

	if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
		if (0 !== child_process.spawnSync('dotnet', [
			'dev-certs',
			'https',
			'--export-path',
			certFilePath,
			'--format',
			'Pem',
			'--no-password',
		], {stdio: 'inherit',}).status) {
			return
			//throw new Error("Could not create certificate.");
		}
	}

	return {
		key: fs.readFileSync(keyFilePath),
		cert: fs.readFileSync(certFilePath),
	}
}

