export class Instruction {
    constructor(instructionString, address) {
        const segments = this.formatInstruction(instructionString)

        this.operationCode = segments[0]
        this.operand1 = segments[1]
        this.operand2 = segments[2]
        this.operand3 = segments[3]
        this.result = 0

        this.address = address

        this.valid = true
    }

    formatInstruction(instructionString) {
        let result = instructionString.toUpperCase()

        //Remove virgulas
        result = result.replaceAll(",", "")


        result = result.trim()


        //Remove comentários
        result = result.split("#")[0]

        //Divide segmentos
        result = result.split(" ")

        return result
    }
}