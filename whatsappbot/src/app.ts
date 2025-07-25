
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MongoAdapter as Database } from '@builderbot/database-mongo'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { ObjectId } from 'mongodb'

const PORT = process.env.PORT ?? 3008

// Función para construir flujos dinámicamente desde la base de datos
const buildFlowsFromDB = async (adapterDB: Database) => {
    console.log('Building flows from DB...')
    const flowsFromDB = await adapterDB.db.collection('flows').find({ isEnabled: true }).toArray()
    const allFlows = []

    for (const flow of flowsFromDB) {
        // Clonamos el array de respuestas para no modificar el original
        const responses = [...flow.responses]
        
        // El primer mensaje se usa para iniciar el flujo
        const firstResponse = responses.shift()

        // Creamos un nuevo flujo con las palabras clave
        let flowBuilder = addKeyword(flow.keywords)
            .addAnswer(firstResponse.content, { media: firstResponse.media ?? null })

        // Añadimos las respuestas restantes en cadena
        for (const response of responses) {
            flowBuilder = flowBuilder.addAnswer(response.content, { media: response.media ?? null })
        }

        allFlows.push(flowBuilder)
    }
    
    // Si no hay flujos, creamos uno por defecto para evitar que el bot falle
    if (allFlows.length === 0) {
        console.log('No flows found in DB, creating default fallback flow.')
        const fallbackFlow = addKeyword(utils.setEvent('__FALLBACK__')).addAnswer('Default fallback message: No flows configured.')
        allFlows.push(fallbackFlow)
    }

    return createFlow(allFlows)
}

const main = async () => {
    // Inicializamos la base de datos primero para usarla en la API y en la construcción de flujos
    const adapterDB = new Database({
        dbUri: process.env.MONGO_DB_URI,
        dbName: process.env.MONGO_DB_NAME,
    })

    // Construimos los flujos iniciales desde la DB
    const adapterFlow = await buildFlowsFromDB(adapterDB)
    const adapterProvider = createProvider(Provider)

    const botInstance = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    // API para gestionar flujos
    adapterProvider.server.get('/v1/flows', async (_, res) => {
        const flows = await adapterDB.db.collection('flows').find().toArray()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(flows))
    })

    adapterProvider.server.post('/v1/flows', async (req, res) => {
        const newFlow = req.body
        await adapterDB.db.collection('flows').insertOne(newFlow)
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', message: 'Flow created' }))
    })

    adapterProvider.server.put('/v1/flows/:id', async (req, res) => {
        const { id } = req.params
        const updatedFlow = req.body
        delete updatedFlow._id // No se puede actualizar el _id
        await adapterDB.db.collection('flows').updateOne({ _id: new ObjectId(id) }, { $set: updatedFlow })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', message: 'Flow updated' }))
    })

    adapterProvider.server.delete('/v1/flows/:id', async (req, res) => {
        const { id } = req.params
        await adapterDB.db.collection('flows').deleteOne({ _id: new ObjectId(id) })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', message: 'Flow deleted' }))
    })

    // API para recargar los flujos del bot
    adapterProvider.server.post('/v1/bot/reload', async (req, res) => {
        try {
            console.log('Restarting bot...');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', message: 'Bot restarting' }));
            process.exit(0); // Forcing a restart, PM2 will handle it
        } catch (error) {
            console.error('Error restarting bot:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to restart bot' }));
        }
    });
    
    botInstance.httpServer(+PORT)
}

main()
