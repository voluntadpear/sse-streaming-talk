import fs from "node:fs";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

const PORT = 8595;

const messagesEmitter = new EventEmitter();

const server = http.createServer(function (request, response) {
  if (request.url === "/") {
    respondWithFile(response, "./index.html");
  } else if (request.url === "/admin") {
    respondWithFile(response, "./admin.html");
  } else if (request.url === "/streaming") {
    respondWithFile(response, "./streaming.html");
  } else if (request.url === "/api/message") {
    let data = "";
    request
      .on("data", (chunk) => {
        data += chunk;
      })
      .on("end", () => {
        const searchParams = new URLSearchParams(data);
        const message = searchParams.get("message") ?? "";
        messagesEmitter.emit("message", message);
        response.writeHead(302, { Location: "/admin" });
        response.end();
      });
  } else if (request.url === "/notifications") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });
    response.write(": connection opened");
    function messageListener(message) {
      response.write("event: message\n");
      response.write(`id: ${randomUUID()}\n`);
      response.write(`data: ${message}\n\n`);
    }
    messagesEmitter.on("message", messageListener);
    request.on("close", () => {
      messagesEmitter.off("message", messageListener);
      response.end();
    });
  } else if (request.url === "/lib.js") {
    respondWithFile(response, "./lib.js", "text/javascript");
  } else {
    response.writeHead(404);
    response.end();
  }
});

server.listen(PORT).on("listening", () => {
  console.log(`Listening on PORT ${PORT}`);
});

function respondWithFile(response, path, type = "text/html") {
  response.writeHead(200, { "Content-Type": type });
  response.write(fs.readFileSync(path));
  response.end();
}
