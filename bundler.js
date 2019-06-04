/**
 * @param {string[]} f Относительный путь к файлу
 * @param {string[]} t Текст
 * @param {string[]} tf Относительный путь к файлу с текстом в кодировке UTF-8
 * @param {string[]} o Название файла экспорта
*/

// Подключаем модули
const fs = require("fs")
const path = require("path")
const JSZip = require("jszip")
const { version } = require("./package.json")

// Вывод версии
console.log(`Electro Air Bundler ${version}`)
console.log(`Running in ${process.cwd()}`)
console.log("")

const actArgs = process.argv.slice(2)

// Флаг для режима отладки
let isDebug = false
if (actArgs.includes("--debug")) isDebug = true

if (actArgs[0] === "help" || actArgs.includes("--help") || actArgs.includes("-h")
    || actArgs.includes("--version") || actArgs.includes("-v")) {
    console.log(`HELP

GENERAL COMMANDS
    help, --help, -h    Help file
    --version, -v       Alias for --help
    --debug         Enable extended debug output

BUNDLING
    -f                  Relative paths to files
    -t                  Plain texts
    -tf                 Relative paths to text files in UTF-8 encoding
    -o                  Name and/or path for output file
    
EXAMPLE COMMAND
    ./bundler -f attachment.zip -f design.ai -t "Hello, world" -f package.json -tf message.txt -t HelloWorld
    
Made by Sominemo in 2019`)

    process.exit()
}

// Функция для получения параметров из командной строки
function argsParser(x) {
    // Если параметров не осталось - выходим
    if (x.length === 0) return []

    // Сдвиг к следующему параметру
    let offset = 1
    // Здесь будут полученные элементы данной интерации
    const args = []

    // Определение параметра с одной -чертой
    const nameMatch = x[0].match(/^-(.+)$/)
    // определение ппараметра с двумя --чертами
    const longNameMatch = (nameMatch ? nameMatch[1].match(/^-(.+)$/) : null)

    // Если параметр без черты - значит это команда
    if (!nameMatch) args.push({ type: "command", name: x[0], value: true })
    // Если параметр с двумя чертами - значит это флаг
    else if (longNameMatch) {
        args.push({ type: "flag", name: longNameMatch[1], value: true })
    } else if (nameMatch) {
        // Если параметр с одной чертой - это флаг категории (-категория <флаг>)
        args.push({ type: nameMatch[1], value: x[1] })
        // Двойной сдвиг
        offset = 2
    }

    // Вызвать рекурсию и передать результат
    return [...args, ...argsParser(x.slice(offset))]
}
let args
try {
    // Получить аргументы командной строки
    args = argsParser(actArgs)
} catch (e) {
    if (isDebug) console.error(e)
    console.error(`🛑  Failed to get command prompt parameters${isDebug ? "" : ". Use --debug flag next time to see details"}`)
    process.exit(1)
}

// Прослойка для превращений некоторых "ненастоящих" типов, таких как textFile
const types = []
// Путь файла вывода
let outputFile = "bundle.zip"

try {
    // Перебираем полученные параметры
    args.forEach((e) => {
        // Если файл
        if (e.type === "f") {
            // Указываем, что это файл, оригинальное имя (без папки), читаем содержимое
            types.push({
                type: "file",
                content: fs.readFileSync(path.join(process.cwd(), e.value)),
                name: path.basename(e.value),
            })
        }

        // Указываем, что это текст, копируем содержимое из параметров командной строки
        if (e.type === "t") {
            types.push({
                type: "text",
                content: e.value,
            })
        }

        // Читаем файл как UTF-8, передаем данные, делая вид, что это обычный текст типа -t
        if (e.type === "tf") {
            types.push({
                type: "text",
                content: fs.readFileSync(path.join(process.cwd(), e.value), "UTF-8"),
            })
        }

        if (e.type === "o") {
            outputFile = e.value
        }
    })
    // Если ошибка - выход из программы
} catch (e) {
    if (isDebug) console.error(e)
    console.error(`🛑  Some items can't be accessed${isDebug ? "" : ". Use --debug flag next time to see details"}`)
    process.exit(2)
}

// Выводим результаты обработки параметров, если отладка
if (isDebug) console.log(types)

// Инициализируем новый архив
const zip = new JSZip()
// Создаем папки meta и files
const metaDir = zip.folder("meta")
const filesDir = zip.folder("files")

// Словарь типов соответствено индексам. 0 - file. 1 - text.
const typeMap = [
    "file",
    "text",
]

// Описание файлов в map.json
const map = []

// Если паковать нечего - выход.
if (types.length === 0) {
    console.error("❓  No items specified. Check out 'bundler help' for commands")
    process.exit(6)
}

// Пакуем файлы и текст
try {
    types.forEach((e, i) => {
        // Генерируем название файла, которое у нас соответствует порядковому номеру
        const fileName = String(i)
        // Определяем тип вложения для сервера
        const itemType = typeMap.indexOf(e.type)
        // Сообщаем о паковании файла
        console.log(`📦  Packing ${(itemType === 0 ? e.name : "text")} #${i}`)
        // Пакуем файл с новым именем
        filesDir.file(fileName, e.content)
        // Записываем данные о файле
        map.push({
            type: itemType,
            name: fileName,
            // Если файл - записываем имя
            ...(itemType === 0 ? { file: e.name } : {}),
        })
    })
    // Если ошибка - выход из программы
} catch (e) {
    if (isDebug) console.error(e)
    console.error(`🛑  Some items can't be packed${isDebug ? "" : ". Use --debug flag next time to see details"}`)
    process.exit(3)
}

console.log("")

try {
    // Ссообщаем о начале сохранения метаданных файлов
    console.log("📇  Saving files metadata")
    // Пакуем информацию о файлах
    metaDir.file("files.json", JSON.stringify(map))

    // Ссообщаем о начале сохранения метаданных бандла
    console.log("📇  Saving bundle metadata")
    // Создаём файл описания бандла
    const bundleMeta = {}
    bundleMeta.version = version
    // Пакуем информацию о бандле
    metaDir.file("bundle.json", JSON.stringify(bundleMeta))
    // Если ошибка - выход из программы
} catch (e) {
    if (isDebug) console.error(e)
    console.error(`🛑  Failed to pack metadata${isDebug ? "" : ". Use --debug flag next time to see details"}`)
    process.exit(4)
}

console.log("")

// Ссообщаем о начале вывода ZIP файла
console.log("✨  Started bundle output")

try {
    // Сохраняем файл
    const fileStream = fs.createWriteStream(outputFile)
    const archiveStream = zip.generateNodeStream({ type: "nodebuffer", streamFiles: true })
    const pipeStream = archiveStream.pipe(fileStream)
    pipeStream.on("finish", () => {
        // Сообщаем о успехе
        console.log(`✅  Bundle generated and saved to ${outputFile}`)
    })
    pipeStream.on("error", (err) => {
        if (isDebug) console.error(err)
        console.error(`🛑  Failed to save the bundle to specified destination. ${err.message}${isDebug ? "" : ". Use --debug flag next time to see details"}`)
        process.exit(5)
    })
    // Если ошибка - выход из программы
} catch (e) {
    if (isDebug) console.error(e)
    console.error(`🛑  Failed to save the bundle to specified destination${isDebug ? "" : ". Use --debug flag next time to see details"}`)
    process.exit(5)
}
