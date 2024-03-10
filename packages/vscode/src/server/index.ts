import {
    createConnection,
    createServer,
    createTypeScriptProjectProviderFactory,
    loadTsdkByPath,
} from "@volar/language-server/node";
import { create as createHtmlService } from "volar-service-html";
import { create as createTypeScriptService } from "volar-service-typescript";
import { partialLanguage, partialService } from "./language/partial";

const connection = createConnection();
const server = createServer(connection);

connection.listen();

connection.onInitialize((params) => {
    console.log("INITIALIZING");
    const tsdk = loadTsdkByPath(
        params.initializationOptions.typescript.tsdk,
        params.locale,
    );
    return server.initialize(
        params,
        createTypeScriptProjectProviderFactory(
            tsdk.typescript,
            tsdk.diagnosticMessages,
        ),
        {
            getLanguagePlugins() {
                return [partialLanguage];
            },
            getServicePlugins() {
                return [
                    createHtmlService(),
                    createTypeScriptService(tsdk.typescript),
                    partialService,
                ];
            },
        },
    );
});

connection.onInitialized(server.initialized);

connection.onShutdown(server.shutdown);
