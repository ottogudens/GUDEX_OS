
"use server";

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BOT_NAME = 'whatsapp-bot'; // Debe coincidir con el 'name' en ecosystem.config.cjs
const BOT_DIR = 'whatsappbot'; // El directorio donde reside el bot

// Helper genérico para comandos simples como 'stop' y 'restart'
async function runPM2Command(command: string) {
    try {
        const { stdout, stderr } = await execAsync(`cd ${BOT_DIR} && pm2 ${command} ${BOT_NAME}`);
        if (stderr) {
            if (stderr.includes('does not exist') || stderr.includes('not found')) {
                return { success: true, message: `El bot '${BOT_NAME}' ya estaba detenido.` };
            }
            // Tratar otros mensajes de stderr como advertencias, no como errores fatales.
            console.warn(`PM2 stderr for command '${command}':`, stderr);
        }
        return { success: true, message: `Comando '${command}' ejecutado con éxito.`, data: stdout };
    } catch (error: any) {
        console.error(`Error executing PM2 command '${command}':`, error);
        return { success: false, message: error.message };
    }
}


export async function getBotStatusAction(): Promise<{ status: 'online' | 'stopped' | 'errored', details: string }> {
    // Usamos 'jlist' para obtener un JSON fácil de parsear.
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
        return { status: 'errored', details: 'No se pudo interpretar la respuesta de PM2. Puede que el servicio no esté corriendo.' };
    }

    return { status: 'stopped', details: 'El servicio del bot está detenido o no se encuentra en la lista de PM2.' };
}

export async function startBotAction() {
    try {
        // Usamos el archivo de configuración, que es la forma más robusta de iniciar.
        // PM2 es lo suficientemente inteligente para no duplicar el proceso si ya existe.
        const { stdout, stderr } = await execAsync(`cd ${BOT_DIR} && pm2 start ecosystem.config.cjs`);

        if (stderr && stderr.includes('already launched')) {
            return { success: true, message: 'El bot ya se encuentra en línea.' };
        } else if (stderr) {
            // Captura otros posibles errores durante el arranque
            return { success: false, message: `Error al iniciar: ${stderr}` };
        }

        // Guardamos el estado para que PM2 lo reviva después de reinicios del sistema.
        await execAsync(`cd ${BOT_DIR} && pm2 save`);
        
        return { success: true, message: 'El bot se ha iniciado correctamente.' };
    } catch (error: any) {
        console.error('Error executing PM2 start command:', error);
        return { success: false, message: `Fallo el comando de inicio: ${error.message}` };
    }
}

export async function stopBotAction() {
    return runPM2Command('stop');
}

export async function restartBotAction() {
    return runPM2Command('restart');
}
