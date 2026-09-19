const targets = await fetch("http://localhost:9222/json").then((response) => response.json());
const page = targets.find((target) => target.type === "page" && target.url.includes("localhost:3000"));

if (!page) throw new Error("No local page target found");

const expression = `JSON.stringify({
  innerWidth,
  outerWidth,
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  bodyWidth: document.body.scrollWidth,
  scrollX,
  direction: getComputedStyle(document.body).direction,
  outside: [...document.querySelectorAll("body *")]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        className: String(element.className).slice(0, 100),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    })
    .filter((item) => item.right > innerWidth + 1 || item.left < -1)
    .sort((a, b) => b.width - a.width)
    .slice(0, 30),
})`;

const socket = new WebSocket(page.webSocketDebuggerUrl);
socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
});
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id !== 1) return;
  console.log(message.result.result.value);
  socket.close();
});
