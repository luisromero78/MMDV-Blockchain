#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reto 2 – Simulación de Blockchain con PoW y PoS
Autor: Luis Romero (MMDV) – con ayuda de Pepe (GPT)
Descripción:
  - Mini blockchain educativa que compara Proof of Work (PoW) y Proof of Stake (PoS).
  - Mide tiempos de validación y muestra diferencias clave.
  - Sin librerías externas: solo hashlib, time, random, json.
Uso:
  python Reto2_LuisRomero.py
"""

import time, json, random, hashlib, csv
from dataclasses import dataclass, asdict, field
from typing import List, Optional, Dict, Any


# -------------------------
# 1) Datos básicos
# -------------------------

@dataclass
class Transaction:
    sender: str
    receiver: str
    amount: float
    timestamp: float = field(default_factory=lambda: time.time())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sender": self.sender,
            "receiver": self.receiver,
            "amount": self.amount,
            "timestamp": self.timestamp,
        }


@dataclass
class Block:
    index: int
    prev_hash: str
    transactions: List[Transaction]
    timestamp: float = field(default_factory=lambda: time.time())
    nonce: int = 0                 # usado en PoW
    validator: Optional[str] = None  # usado en PoS (quién firma el bloque)
    hash: str = ""

    def compute_hash(self) -> str:
        # Serializamos contenido del bloque de forma determinista
        block_dict = {
            "index": self.index,
            "prev_hash": self.prev_hash,
            "transactions": [t.to_dict() for t in self.transactions],
            "timestamp": self.timestamp,
            "nonce": self.nonce,
            "validator": self.validator,
        }
        block_string = json.dumps(block_dict, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(block_string.encode()).hexdigest()


# -------------------------
# 2) Utilidades comunes
# -------------------------

def make_genesis_block() -> Block:
    genesis = Block(index=0, prev_hash="0"*64, transactions=[], nonce=0, validator="GENESIS")
    genesis.hash = genesis.compute_hash()
    return genesis


def validate_chain(chain: List[Block]) -> bool:
    """Comprueba integridad de enlaces y hash recomputado."""
    for i in range(1, len(chain)):
        prev = chain[i-1]
        curr = chain[i]
        if curr.prev_hash != prev.hash:
            return False
        # Recompute hash integrity
        if curr.compute_hash() != curr.hash:
            return False
    return True


# -------------------------
# 3) PoW – Proof of Work
# -------------------------

def mine_pow_block(block: Block, difficulty: int = 4) -> Dict[str, Any]:
    """Minado simple: busca un hash con 'difficulty' ceros iniciales."""
    prefix = "0" * difficulty
    start = time.time()
    attempts = 0
    # Incrementa nonce hasta que el hash cumpla el prefijo
    while True:
        block.hash = block.compute_hash()
        attempts += 1
        if block.hash.startswith(prefix):
            break
        block.nonce += 1
    elapsed = time.time() - start
    return {"time": elapsed, "attempts": attempts, "hash": block.hash}


def build_pow_chain(num_blocks: int = 5, tx_per_block: int = 3, difficulty: int = 4) -> Dict[str, Any]:
    chain: List[Block] = [make_genesis_block()]
    timings = []
    # Población de usuarios ficticios
    users = ["Alice", "Bob", "Carol", "Dave", "Eve"]

    for i in range(1, num_blocks + 1):
        txs = []
        for _ in range(tx_per_block):
            s, r = random.sample(users, 2)
            amt = round(random.uniform(0.1, 10.0), 2)
            txs.append(Transaction(sender=s, receiver=r, amount=amt))
        blk = Block(index=i, prev_hash=chain[-1].hash, transactions=txs)
        result = mine_pow_block(blk, difficulty=difficulty)
        chain.append(blk)
        timings.append({"block": i, "time_sec": result["time"], "attempts": result["attempts"]})
    return {"chain": chain, "timings": timings, "difficulty": difficulty}


# -------------------------
# 4) PoS – Proof of Stake
# -------------------------

def select_pos_validator(validators: List[Dict[str, Any]]) -> str:
    """Selección ponderada por stake."""
    total = sum(v["stake"] for v in validators)
    pick = random.uniform(0, total)
    acc = 0.0
    for v in validators:
        acc += v["stake"]
        if acc >= pick:
            return v["name"]
    return validators[-1]["name"]  # fallback improbable


def build_pos_chain(num_blocks: int = 5, tx_per_block: int = 3, validators: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    if validators is None:
        validators = [
            {"name": "Val_Alice", "stake": 60},
            {"name": "Val_Bob",   "stake": 30},
            {"name": "Val_Carol", "stake": 10},
        ]

    chain: List[Block] = [make_genesis_block()]
    timings = []
    users = ["Alice", "Bob", "Carol", "Dave", "Eve"]

    for i in range(1, num_blocks + 1):
        txs = []
        for _ in range(tx_per_block):
            s, r = random.sample(users, 2)
            amt = round(random.uniform(0.1, 10.0), 2)
            txs.append(Transaction(sender=s, receiver=r, amount=amt))

        # Selección de validador (ponderada por stake)
        validator = select_pos_validator(validators)

        # "Validación" en PoS (no hay minería intensiva): solo calcular hash una vez
        blk = Block(index=i, prev_hash=chain[-1].hash, transactions=txs, validator=validator)

        start = time.time()
        blk.hash = blk.compute_hash()
        # simulamos una latencia pequeña de consenso/propagación
        time.sleep(0.01)
        elapsed = time.time() - start

        chain.append(blk)
        timings.append({"block": i, "time_sec": elapsed, "validator": validator})
    return {"chain": chain, "timings": timings, "validators": validators}


# -------------------------
# 5) Experimento comparativo
# -------------------------

def run_experiment(num_blocks: int = 5, tx_per_block: int = 3, difficulty: int = 4):
    print("=== Experimento: PoW vs PoS ===")
    print(f"Bloques: {num_blocks} | Tx por bloque: {tx_per_block} | Dificultad PoW: {difficulty}")
    print()

    # PoW
    pow_res = build_pow_chain(num_blocks=num_blocks, tx_per_block=tx_per_block, difficulty=difficulty)
    pow_chain = pow_res["chain"]
    pow_times = pow_res["timings"]
    print("[PoW] Integridad de cadena:", "OK" if validate_chain(pow_chain) else "ERROR")
    total_pow_time = sum(t["time_sec"] for t in pow_times)
    avg_pow_time = total_pow_time / len(pow_times)
    print(f"[PoW] Tiempo total: {total_pow_time:.3f}s | Promedio por bloque: {avg_pow_time:.3f}s")
    print(f"[PoW] Ejemplo hash bloque 1: {pow_chain[1].hash[:18]}... | intentos: {pow_times[0]['attempts']}")
    print()

    # PoS
    pos_res = build_pos_chain(num_blocks=num_blocks, tx_per_block=tx_per_block)
    pos_chain = pos_res["chain"]
    pos_times = pos_res["timings"]
    print("[PoS] Integridad de cadena:", "OK" if validate_chain(pos_chain) else "ERROR")
    total_pos_time = sum(t["time_sec"] for t in pos_times)
    avg_pos_time = total_pos_time / len(pos_times)
    print(f"[PoS] Tiempo total: {total_pos_time:.3f}s | Promedio por bloque: {avg_pos_time:.3f}s")
    print(f"[PoS] Validador bloque 1: {pos_times[0]['validator']} | hash: {pos_chain[1].hash[:18]}...")
    print()

    # Tabla pequeña de resultados
    print("Bloque | PoW_time(s) | PoS_time(s) | PoW_attempts | PoS_validator")
    for i in range(num_blocks):
        pow_t = pow_times[i]["time_sec"]
        pos_t = pos_times[i]["time_sec"]
        attempts = pow_times[i]["attempts"]
        validator = pos_times[i]["validator"]
        print(f"{i+1:>6} | {pow_t:>11.4f} | {pos_t:>10.4f} | {attempts:>12} | {validator}")

    # Exportamos CSV con timings
    with open("resultados_reto2_timings.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["block", "pow_time_sec", "pow_attempts", "pos_time_sec", "pos_validator"])
        for i in range(num_blocks):
            writer.writerow([
                i+1,
                pow_times[i]["time_sec"],
                pow_times[i]["attempts"],
                pos_times[i]["time_sec"],
                pos_times[i]["validator"],
            ])
    print("\nCSV generado: resultados_reto2_timings.csv")


if __name__ == "__main__":
    # Puedes ajustar parámetros aquí para probar distintos escenarios
    run_experiment(num_blocks=5, tx_per_block=3, difficulty=4)
