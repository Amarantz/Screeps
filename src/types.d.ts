
// memory extension samples
interface CreepMemory {
  role: string;
}

interface Memory {
  NOD: {};
  uuid: number;
  logLevel: any;
  log: any;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
