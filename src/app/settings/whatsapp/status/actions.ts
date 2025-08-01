
"use server";

import { exec } from 'child_process';
import { promisify } from 'util';
import { requireRole } from '@/lib/server-auth';

const execAsync = promisify(exec);

// --- ZONA DE ALTO RIESGO ---
// Estas acciones ejecutan comandos de terminal en el servidor.
// DEBEN estar protegidas con la máxima restricción de roles.

const BOT_NAME = 'whatsapp-bot';
const BOT_DIR = 'whatsappbot';

// Función de ayuda interna. La protección de rol se hace en las acciones exportadas.
async function runPM2Command(command: 'stop' | 'restart') {
    try {
        const { stdout, stderr } = await execAsync(`cd ${BOT_DIR} && pm2 ${command} ${BOT_NAME}`);
        if (stderr) {
            if (stderr.includes('does not exist') || stderr.includes('not found')) {
                return { success: true, message: `El bot '${BOT_NAME}' ya estaba detenido.` };
            }
            console.warn(`PM2 stderr for command '${command}':`, stderr);
        }
        return { success: true, message: `Comando '${command}' ejecutado con éxito.`, data: stdout };
    } catch (error: any) {
        console.error(`Error executing PM2 command '${command}':`, error);
        return { success: false, message: error.message };
    }
}

export async function getBotStatusAction(): Promise<{ status: 'online' | 'stopped' | 'errored', details: string }> {
    await requireRole(['Administrador']);
    
    const result = await execAsync(`cd ${BOT_DIR} && pm2 jlist`).catch(() => ({ stdout: '[]', stderr: 'PM2 not running' }));
    
    try {
        const pm2Info = JSON.parse(result.stdout);
        const botInfo = pm2Info.find((app: any) => app.name === BOT_NAME);
        
        if (botInfo && botInfo.pm2_env.status === 'online') {
            const uptimeMinutes = Math.round((Date.now() - botInfo.pm2_env.pm_uptime) / 1000 / 60);
            return { 
                status: 'online', 
                details: `En línea desde hace ${uptimeMinutes} min. | CPU: ${botInfo.monit.cpu}% | Mem: ${Math.round(botInfo.monit.memory / 1024 / 1024)} MB` 
            };
        }
    } catch (e) {
        return { status: 'errored', details: 'No se pudo interpretar la respuesta de PM2.' };
    }

    return { status: 'stopped', details: 'El servicio del bot está detenido o no se encuentra.' };
}

export async function startBotAction(): Promise<{ success: boolean, message: string }> {
    await requireRole(['Administrador']);
    try {
        const { stdout, stderr } = await execAsync(`cd ${BOT_DIR} && pm2 start ecosystem.config.cjs`);

        if (stderr && stderr.includes('already launched')) {
            return { success: true, message: 'El bot ya se encuentra en línea.' };
        } else if (stderr) {
            return { success: false, message: `Error al iniciar: ${stderr}` };
        }

        await execAsync(`cd ${BOT_DIR} && pm2 save`);
        
        return { success: true, message: 'El bot se ha iniciado correctamente.' };
    } catch (error: any) {
        console.error('Error executing PM2 start command:', error);
        return { success: false, message: `Fallo el comando de inicio: ${error.message}` };
    }
}

export async function stopBotAction(): Promise<{ success: boolean, message: string }> {
    await requireRole(['Administrador']);
    return runPM2Command('stop');
}

export async function restartBotAction(): Promise<{ success: boolean, message: string }> {
    await requireRole(['Administrador']);
    return runPM2Command('restart');
}
