import { Socket } from 'node:net';
import { Writable } from 'node:stream';

type LogDestinationOptions = {
  enabled: boolean;
  host: string;
  port: number;
  mirrorStdout?: boolean;
};

class LogDestinationStream extends Writable {
  private socket: Socket | null = null;
  private connecting = false;

  constructor(private readonly options: LogDestinationOptions) {
    super();
  }

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);

    if (this.options.mirrorStdout ?? true) {
      process.stdout.write(buffer);
    }

    if (!this.options.enabled) {
      callback();
      return;
    }

    this.ensureSocket();
    if (!this.socket || !this.socket.writable) {
      callback();
      return;
    }

    this.socket.write(buffer, callback);
  }

  override _final(callback: (error?: Error | null) => void) {
    if (this.socket) {
      this.socket.end(() => callback());
      return;
    }

    callback();
  }

  private ensureSocket() {
    if (this.socket || this.connecting) {
      return;
    }

    this.connecting = true;
    const socket = new Socket();
    socket.setKeepAlive(true, 5000);
    socket.on('connect', () => {
      this.connecting = false;
    });
    socket.on('error', () => {
      this.connecting = false;
      this.socket?.destroy();
      this.socket = null;
    });
    socket.on('close', () => {
      this.connecting = false;
      this.socket = null;
    });
    socket.connect(this.options.port, this.options.host);
    this.socket = socket;
  }
}

export const createLogDestinationStream = (options: LogDestinationOptions) =>
  new LogDestinationStream(options);
