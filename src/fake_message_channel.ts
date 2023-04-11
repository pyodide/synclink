class FakeMessagePort {
  _otherPort: FakeMessagePort;
  _handlers: ((msg: { data: any }) => void)[] = [];
  _bypass: boolean = true;
  start() {}
  close() {}

  constructor() {
    this._otherPort = this;
  }

  addEventListener(event: string, handler: (msg: { data: any }) => void) {
    if (event === "message") {
      this._handlers.push(handler);
    }
  }

  removeEventListener(event: string, handler: (msg: { data: any }) => void) {
    if (event !== "message") {
      return;
    }
    let idx = this._handlers.indexOf(handler);
    if (idx >= 0) {
      this._handlers.splice(idx, 1);
    }
  }

  postMessage(message: any, transfer: Transferable[]) {
    for (const h of this._otherPort._handlers) {
      h({ data: message });
    }
  }
}

class FakeMessageChannel {
  port1: FakeMessagePort;
  port2: FakeMessagePort;
  constructor() {
    this.port1 = new FakeMessagePort();
    this.port2 = new FakeMessagePort();
    this.port1._otherPort = this.port2;
    this.port2._otherPort = this.port1;
  }
}

let FakeMessageChannel1 =
  FakeMessageChannel as unknown as typeof MessageChannel;

export { FakeMessageChannel1 as FakeMessageChannel };
