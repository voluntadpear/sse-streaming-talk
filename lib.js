export async function processStreaming(response, start) {
  const readableStream = response.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformer = new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk);

      // remove `data: ` prefix
      const transformedLines = text
        .split("\n")
        .filter(Boolean)
        .map((line) => line.replace("data: ", ""));

      transformedLines.forEach((line) => {
        if (line === "[DONE]") {
          controller.terminate();
          return;
        }
        const parsed = JSON.parse(line);
        const possibleValue = parsed.choices[0]?.delta?.content;
        if (possibleValue) {
          controller.enqueue(encoder.encode(possibleValue));
        }
      });
    },
  });

  const finalStream = readableStream.pipeThrough(transformer);

  let buffer = "";

  // Modalidad todavía no soportada por navegadores
  // for await (const chunk of response.body)
  const reader = finalStream.getReader();
  let done, value;

  while (!done) {
    ({ value, done } = await reader.read());
    if (done) {
      break;
    }
    const chunk = decoder.decode(value);
    if (!buffer) {
      buffer += chunk;
      const end = performance.now();
      li(`Tiempo ⌚️: ${Math.round(end - start)} ms\n Asistente: ${buffer}`, {
        className: "assistant",
      });
    } else {
      buffer += chunk;
      document.querySelector("li:last-child").innerText += chunk;
    }
  }
}

export async function processJSON(response, start) {
  const json = await response.json();

  const end = performance.now();

  const output = `Tiempo ⌚️: ${Math.round(end - start)} ms\nAsistente: ${
    json.choices[0].message.content
  }\n`;
  li(output, { className: "assistant" });
}

export function li(text, options = {}) {
  const ul = document.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = text;

  if (options.className) {
    li.classList.add(options.className);
  }
  ul.appendChild(li);
}
