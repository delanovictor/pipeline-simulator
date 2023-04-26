<script>
    // @ts-nocheck

    import { Instruction } from "./instruction.js"
    const INSTRUCTION_LIST = {
        ADD: 0,
        ADDI: 1,
        SUB: 2,
        SUBI: 3,
        BEQ: 4,
        B: 5,
        HLT: 6,
    }

    const code = `ADDI R1, R0, 1
    ADDI R2, R0, 1
    ADDI R3, R0, 4
    ADDI R4, R0, 4
    NOP
    NOP
    NOP
    BEQ R0, R3, 5
    SUBI R3, R3, 1
    ADDI R1, R1, 1
    NOP
    B -4
    BEQ R0, R4, 7
    SUBI R4, R4, 1
    NOP
    ADDI R2, R2, 1
    ADDI R3, R0, 5
    NOP
    B -11
    NOP
    HLT`

    const INSTRUCTION_MEMORY = code.split("\n")
    console.log(INSTRUCTION_MEMORY)
    const INSTRUCTION_OBJECTS = INSTRUCTION_MEMORY.map((item, index) => new Instruction(item, index))
    console.log(INSTRUCTION_OBJECTS)

    const registers = {
        R0: 0,
        R1: 0,
        R2: 0,
        R3: 0,
        R4: 0,
        R5: 0,
        R6: 0,
        R7: 0,
        R8: 0,
        R9: 0,
        R10: 0,
        R11: 0,
        R12: 0,
        R13: 0,
        R14: 0,
        R15: 0,
        R16: 0,
        R17: 0,
        R18: 0,
        R19: 0,
        R20: 0,
        R21: 0,
        R22: 0,
        R23: 0,
        R24: 0,
        R25: 0,
        R26: 0,
        R27: 0,
        R28: 0,
        R29: 0,
        R30: 0,
        R31: 0,
    }

    const predictTable = new Array(32).fill(0)

    let PC = 0
    let skipIncrement = false
    let isHalted = false

    let enablePrediction = true
    let predictionBits = 2

    const bus = {
        "IF/ID": null,
        "ID/EX": null,
        "EX/MEM": null,
        "MEM/WB": null,
        WB: null,
    }
    const ALU = {
        inputA: 0,
        inputB: 0,
        output: 0,
    }

    const counter = {
        clockCycles: 0,
        rPredictions: 0,
        wPredictions: 0,
    }

    const INSTRUCTION_FETCH = () => {
        console.log(`FETCH! ${PC}`)
        const instruction = INSTRUCTION_OBJECTS[PC]

        if (instruction) instruction.valid = true

        bus["IF/ID"] = instruction

        if (skipIncrement) {
            skipIncrement = false
        } else {
            PC++
        }
    }

    const INSTRUCTION_DECODE = () => {
        const instruction = bus["IF/ID"]

        if (instruction) {
            instruction.result = null

            switch (instruction.operationCode) {
                case "NOP":
                    break
                case "ADD":
                case "SUB":
                    ALU.inputA = registers[instruction.operand2]
                    ALU.inputB = registers[instruction.operand3]
                    break
                case "ADDI":
                case "SUBI":
                    ALU.inputA = registers[instruction.operand2]
                    ALU.inputB = instruction.operand3
                    break

                case "B":
                    PC = instruction.address + Number(instruction.operand1)
                    // skipIncrement = true
                    break
                case "BEQ":
                case "BNE":
                    ALU.inputA = registers[instruction.operand1]
                    ALU.inputB = registers[instruction.operand2]

                    if (enablePrediction) {
                        console.log("PREDICT!")
                        instruction.predictedResult = GET_PREDICTION(instruction)
                        console.log(instruction)
                    } else {
                        instruction.predictedResult = false
                    }

                    if (instruction.predictedResult) {
                        PC = instruction.address + Number(instruction.operand3)
                        skipIncrement = true
                    }

                    break
            }
        }

        bus["ID/EX"] = instruction
    }

    const EXECUTE = () => {
        const instruction = bus["ID/EX"]

        if (instruction) {
            if (instruction.valid) {
                switch (instruction.operationCode) {
                    case "NOP":
                        break
                    case "ADD":
                    case "ADDI":
                        ALU.output = Number(ALU.inputA) + Number(ALU.inputB)
                        break
                    case "SUB":
                    case "SUBI":
                        ALU.output = Number(ALU.inputA) - Number(ALU.inputB)
                        break
                    case "BEQ":
                        ALU.output = Number(ALU.inputA === ALU.inputB)

                        UPDATE_PREDICTION(instruction, ALU.output)

                        break
                    case "BNE":
                        ALU.output = Number(ALU.inputA !== ALU.inputB)

                        UPDATE_PREDICTION(instruction, ALU.output)

                        break
                    case "HLT":
                        alert("HALT")
                        isHalted = true
                        break
                }
                instruction.result = ALU.output
            }
        }

        bus["EX/MEM"] = instruction
    }

    const MEMORY_ACCESS = () => {
        const instruction = bus["EX/MEM"]

        //...

        bus["MEM/WB"] = instruction
    }

    const WRITE_BACK = () => {
        const instruction = bus["MEM/WB"]

        console.log("write back")
        console.log(instruction)

        if (instruction) {
            switch (instruction.operationCode) {
                case "ADD":
                case "ADDI":
                case "SUB":
                case "SUBI":
                    if (instruction.valid) registers[instruction.operand1] = instruction.result
                    break
            }
        }

        bus["WB"] = instruction
    }

    const CLOCK = () => {
        if (isHalted) {
            alert("HALTED")
            return
        }

        WRITE_BACK()
        MEMORY_ACCESS()
        EXECUTE()
        INSTRUCTION_DECODE()
        INSTRUCTION_FETCH()

        counter.clockCycles++
    }

    const GET_PREDICTION = (instruction) => {
        const index = instruction.address % 32

        //ex: predictionBits = 2  =>  0f, 1f, 2t, 3t
        return predictTable[index] >= predictionBits
    }

    const UPDATE_PREDICTION = (instruction, result) => {
        console.log("UPDATE_PREDICTION!")

        console.log(`era ${result} e preveu ${instruction.predictedResult}`)

        const index = instruction.address % 32

        if (result && instruction.predictedResult) {
            counter.rPredictions++

            predictTable[index]++
        }

        if (!result && !instruction.predictedResult) {
            counter.rPredictions++

            predictTable[index]--
        }

        if (result && !instruction.predictedResult) {
            counter.wPredictions++

            predictTable[index]++
            bus["IF/ID"].valid = false
            PC = instruction.address + Number(instruction.operand3)
        }

        if (!result && instruction.predictedResult) {
            counter.wPredictions++

            predictTable[index]--
            bus["IF/ID"].valid = false
            PC = instruction.address + 1
        }

        if (predictTable[index] < 0) predictTable[index] = 0
        if (predictTable[index] > predictionBits) predictTable[index] = predictionBits
    }

    const onKeyPress = (e) => {
        if (e.keyCode === 13 || e.keyCode === 32) CLOCK()

        if (e.keyCode === 8) RESET()
    }

    const RESET = () => {
        counter.clockCycles = 0
        counter.rPredictions = 0
        counter.wPredictions = 0
        PC = 0
        skipIncrement = false
        isHalted = false
        bus["IF/ID"] = null
        bus["ID/EX"] = null
        bus["EX/MEM"] = null
        bus["MEM/WB"] = null
        bus["WB"] = null

        for (const key in registers) {
            registers[key] = 0
        }

        for (const index in predictTable) {
            predictTable[index] = 0
        }
    }

    const EDIT_CODE = () => {}
</script>

<svelte:window on:keydown|preventDefault={onKeyPress} />

<div class="row jf-ct-b">
    <div class="col-2">
        <div class="title">Instructions</div>
        <table id="instructions">
            {#each INSTRUCTION_MEMORY as instruction, index}
                <tr>
                    <td style="min-width:25px;">{index}</td>
                    <td style="min-width: 120px; margin-right: 20px; text-align: left;">{instruction}</td>
                    <td style="min-width:25px;">{PC == index ? "🔴" : ""}</td>
                </tr>
            {/each}
        </table>
    </div>

    <div class="col-9">
        <div class="row interface">
            <div class="col-12">
                <div class="title">Registers</div>

                <table class="registers">
                    <tr>
                        {#each Object.entries(registers).slice(0, Object.entries(registers).length / 2) as reg}
                            <td style="min-width: 40px;">{reg[0]}</td>
                        {/each}
                    </tr>

                    <tr>
                        {#each Object.entries(registers).slice(0, Object.entries(registers).length / 2) as reg}
                            <td style="min-width: 40px;">{reg[1]}</td>
                        {/each}
                    </tr>
                </table>

                <table class="registers">
                    <tr>
                        {#each Object.entries(registers).slice(Object.entries(registers).length / 2) as reg}
                            <td style="min-width: 40px;">{reg[0]}</td>
                        {/each}
                    </tr>

                    <tr>
                        {#each Object.entries(registers).slice(Object.entries(registers).length / 2) as reg}
                            <td style="min-width: 40px;">{reg[1]}</td>
                        {/each}
                    </tr>
                </table>
            </div>

            <div class="col-3">
                <div class="title">ALU</div>

                <table id="alu">
                    <tr>
                        <td>A</td>
                        <td>B</td>
                        <td>Operation</td>
                    </tr>
                    <tr>
                        <td>{ALU.inputA}</td>
                        <td>{ALU.inputB}</td>
                        <td> {bus["EX/MEM"]?.operationCode || ""}</td>
                    </tr>
                </table>
            </div>

            <div class="col-7">
                <div class="title">Counter</div>

                <table id="counter">
                    <tr>
                        <td>PC</td>
                        <td>Clock Cycles</td>
                        <td>Right Predictions</td>
                        <td>Wrong Predictions</td>
                        <td>Prediction</td>
                    </tr>
                    <tr>
                        <td>{PC}</td>
                        <td>{counter.clockCycles}</td>
                        <td>{counter.rPredictions}</td>
                        <td>{counter.wPredictions}</td>
                        <td>
                            <label for="enable-prediction">Enable</label>

                            <input type="checkbox" name="enable-prediction" bind:checked={enablePrediction} />
                            <label for="prediction-bits">Bits</label>
                            <input
                                style="width:50px"
                                type="number"
                                name="prediction-bits"
                                min="1"
                                bind:value={predictionBits}
                                disabled={!enablePrediction}
                            />
                        </td>
                    </tr>
                </table>
            </div>

            <div class="col-1 align-items-center">
                <br /><br />
                <button on:click={RESET}>RESET</button>
            </div>

            <div class="col-12">
                <div class="title">Pipeline</div>

                <table id="pipeline">
                    <tr>
                        <td>FETCH</td>
                        <td>DECODE</td>
                        <td>EXECUTE</td>
                        <td>MEM</td>
                        <td>WRITE BACK</td>
                    </tr>
                    <tr>
                        {#each Object.entries(bus) as instruction}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <td style="height: 40px;" on:click={console.log(bus[instruction[0]])}
                                >{bus[instruction[0]] ? bus[instruction[0]].operationCode : "NOP"}
                                {bus[instruction[0]] ? bus[instruction[0]].operand1 || "" : ""}
                                {bus[instruction[0]] ? bus[instruction[0]].operand2 || "" : ""}
                                {bus[instruction[0]] ? bus[instruction[0]].operand3 || "" : ""}
                                {bus[instruction[0]] ? (bus[instruction[0]].valid ? "" : "❌") || "" : ""}</td
                            >
                        {/each}
                    </tr>
                </table>
            </div>

            <div class="col-12">
                <div class="title">Prediction Table</div>
                <table class="prediction">
                    <tr>
                        {#each Object.entries(predictTable).slice(0, Object.entries(predictTable).length / 2) as reg}
                            <td style="min-width: 40px;">{reg[0]}</td>
                        {/each}
                    </tr>

                    <tr>
                        {#each Object.entries(predictTable).slice(0, Object.entries(predictTable).length / 2) as reg}
                            <td style="min-width: 40px;">{reg[1]}</td>
                        {/each}
                    </tr>
                </table>

                <table class="prediction">
                    <tr>
                        {#each Object.entries(predictTable).slice(Object.entries(predictTable).length / 2) as reg}
                            <td style="min-width: 40px;">{reg[0]}</td>
                        {/each}
                    </tr>

                    <tr>
                        {#each Object.entries(predictTable).slice(Object.entries(predictTable).length / 2) as reg}
                            <td style="min-width: 40px;">{reg[1]}</td>
                        {/each}
                    </tr>
                </table>
            </div>
        </div>
    </div>
</div>

<style>
    #pipeline > tr > td {
        min-width: 100px;
    }

    .interface > div {
        margin-bottom: 15px;
    }
    .row {
        display: flex;
        flex-wrap: wrap;
        margin-right: 0;
        margin-left: 0;
    }

    table {
        width: inherit;
    }

    .title {
        padding-bottom: 7px;
        font-size: medium;
        font-weight: bold;
    }
    :root {
        --even: rgba(34, 34, 53, 0.781);
        --odd: rgba(8, 5, 35, 0.781);
    }

    #instructions tr:nth-child(even) {
        background-color: var(--even);
    }
    #instructions tr:nth-child(odd) {
        background-color: var(--odd);
    }

    .registers tr:nth-child(even) {
        background-color: var(--even);
    }
    .registers tr:nth-child(odd) {
        background-color: var(--odd);
    }

    #alu tr:nth-child(even) {
        background-color: var(--even);
    }
    #alu tr:nth-child(odd) {
        background-color: var(--odd);
    }
    #counter tr:nth-child(even) {
        background-color: var(--even);
    }
    #counter tr:nth-child(odd) {
        background-color: var(--odd);
    }

    #pipeline tr:nth-child(even) {
        background-color: var(--even);
    }
    #pipeline tr:nth-child(odd) {
        background-color: var(--odd);
    }

    .prediction tr:nth-child(even) {
        background-color: var(--even);
    }
    .prediction tr:nth-child(odd) {
        background-color: var(--odd);
    }
</style>
