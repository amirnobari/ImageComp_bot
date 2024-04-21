// process.env["NTBA_FIX_350"] = 1

const TelegramBot = require('node-telegram-bot-api')
const sharp = require('sharp')
const saveImageData = require('./saveImageData')

require('dotenv').config()

const token = process.env.BOT_TOKEN
const bot = new TelegramBot(token, {
    polling: true,
    filepath: false,
    disableContentTypeValidation: true
})

async function checkPublicChannelMembership (userId)
{
    const channel1Id = -1001956864682
    const channel2Id = -1002111615139

    try
    {
        const [channel1Membership, channel2Membership] = await Promise.all([
            bot.getChatMember(channel1Id, userId),
            bot.getChatMember(channel2Id, userId),
        ])

        const isMember1 = channel1Membership.status !== 'left' && channel1Membership.status !== 'kicked'
        const isMember2 = channel2Membership.status !== 'left' && channel2Membership.status !== 'kicked'

        return { channel1: isMember1, channel2: isMember2 }
    } catch (error)
    {
        console.error('Error checking channel memberships:', error)
        return { channel1: false, channel2: false }
    }
}

bot.on('message', async (msg) =>
{
    const chatId = msg.chat.id

    // Check if the message contains a document
    if (msg.document)
    {
        const fileMimeType = msg.document.mime_type

        // Check if the document is an image
        if (fileMimeType.startsWith('image/'))
        {
            // Check channel membership
            const userId = msg.from.id
            const memberships = await checkPublicChannelMembership(userId)

            // Check if user is a member of both channels
            if (memberships.channel1 && memberships.channel2)
            {
                // Function to ask for compression quality
                const askForCompressionQuality = () =>
                {
                    bot.sendMessage(chatId, 'لطفاً کیفیت فشرده‌سازی را انتخاب کنید (عددی بین 1 تا 100): \n ⚠️ عدد کیفیت پیشنهادی (80) میباشد ⚠️', { reply_markup: { force_reply: true } })
                        .then(sentMessage =>
                        {
                            bot.onReplyToMessage(chatId, sentMessage.message_id, async (response) =>
                            {
                                const quality = parseInt(response.text)
                                if (!isNaN(quality) && quality >= 1 && quality <= 100)
                                {
                                    // Send a sticker to the user
                                    const stickerMessage = await bot.sendSticker(chatId, 'CAACAgIAAxkBAAKR4GYiUQ5EmwYIwZG9tp-iw_MwdmZyAAIjAAMoD2oUJ1El54wgpAY0BA')
                                    // Compress and send the image with the original format and the requested quality
                                    const compressedImageMessage = await compressAndSendImage(chatId, userId, msg.document.file_id, fileMimeType, quality)

                                    // Delete the sticker message
                                    bot.deleteMessage(chatId, stickerMessage.message_id)
                                    // Delete the quality message
                                    bot.deleteMessage(chatId, sentMessage.message_id)
                                    bot.deleteMessage(chatId, response.message_id)
                                } else
                                {
                                    // Ask for quality again if the entered value is not valid
                                    bot.sendMessage(chatId, '🚦لطفا برای انتخاب کیفیت مورد نظر فقط عدد وارد کنید 🚦')
                                        .then(() => askForCompressionQuality()) // Ask for quality again
                                }
                            })
                        })
                }

                // Call function to ask for compression quality
                askForCompressionQuality()
            } else
            {
                // Prepare keyboard with channel links
                let errorMessage = 'برای استفاده از این قابلیت، لطفاً در کانال‌های زیر عضو شوید ✔️'
                const keyboard = []

                if (!memberships.channel1)
                {
                    keyboard.push([{ text: 'عضویت در کانال اول ما 1️⃣', url: 'https://t.me/DeepDevs' }])
                }
                if (!memberships.channel2)
                {
                    keyboard.push([{ text: 'عضویت در کانال دوم ما 2️⃣', url: 'https://t.me/InstaDevs' }])
                }
                keyboard.push([{ text: '👉 Use Bot 👈', callback_data: 'use_bot' }])

                // Send error message with keyboard
                bot.sendMessage(chatId, errorMessage, {
                    reply_markup: {
                        inline_keyboard: keyboard,
                    }
                })
            }
        }

    }

})



bot.on('message', async (msg) =>
{
    const chatId = msg.chat.id

    // Check if the message contains a document
    if (msg.document)
    {
        const fileMimeType = msg.document.mime_type
        const fileExtension = msg.document.file_name.split('.').pop().toLowerCase() // Get the file extension and convert it to lowercase

        // Check if the document is an image and its format is jpg or png
        if (fileMimeType.startsWith('image/') && (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png'))
        {
            // The rest of your code for handling image documents...
        } else
        {
            bot.sendMessage(chatId, '🛑لطفا توجه داشته باشید پیام ارسالی به ربات باید بصورت 📁 فایل 📁 باشه و با فرمتهای JPG و PNG باشن 🛑')
        }
    } else if (msg.text)
    {
        // Check if the message is not one of the specified commands or a number between 1 to 100
        if (!msg.text.startsWith('/start') && !msg.text.startsWith('/help') && isNaN(parseInt(msg.text)) && !msg.text.match(/^\d+$/) && !msg.text.match(/^\d{1,3}$/))
        {
            bot.sendMessage(chatId, '🛑لطفا توجه داشته باشید پیام ارسالی به ربات باید بصورت 📁 فایل 📁 باشه و با فرمتهای JPG و PNG باشن 🛑')
        }
    } else
    {
        // If the message is neither a document nor a text message, notify the user to send a file
        bot.sendMessage(chatId, '🛑لطفا توجه داشته باشید پیام ارسالی به ربات باید بصورت 📁 فایل 📁 باشه و با فرمتهای JPG و PNG باشن 🛑')
    }
})





// Function to compress and send image with custom quality
async function compressAndSendImage (chatId, userId, fileId, fileMimeType, quality)
{
    try
    {
        const imageStream = await bot.getFileStream(fileId)
        const imageBuffer = await streamToBuffer(imageStream)

        let compressedImageBuffer

        // Select compression method based on file format
        if (fileMimeType === 'image/png')
        {
            compressedImageBuffer = await sharp(imageBuffer).png({ quality: quality, rotate: 0 }).toBuffer()
        } else if (fileMimeType === 'image/jpeg')
        {
            compressedImageBuffer = await sharp(imageBuffer).jpeg({ quality: quality, rotate: 0 }).toBuffer()
        } else
        {
            // Handle unsupported formats or provide a default compression method
            console.error('Unsupported file format:', fileMimeType)
            return
        }

        // Save user's image data
        saveImageData(userId, fileId)

        // Get the file extension from the MIME type
        const fileExtension = fileMimeType.split('/')[1]
        // Send the compressed image with the original format
        const fileOptions = {
            filename: `compressed_image.${fileExtension}`, // تنظیم نام فایل
            contentType: fileMimeType // تنظیم MIME type
        }
        return await bot.sendDocument(chatId, compressedImageBuffer, {}, fileOptions) // اضافه کردن file options برای تنظیم نام فایل و MIME type

    } catch (error)
    {
        console.error('Error compressing and sending image:', error)
    }
}

// Function to convert stream to buffer
function streamToBuffer (stream)
{
    return new Promise((resolve, reject) =>
    {
        const chunks = []
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', (error) => reject(error))
    })
}

bot.onText(/\/start/, async (msg) =>
{
    const chatId = msg.chat.id
    const userId = msg.from.id

    const memberships = await checkPublicChannelMembership(userId)
    const keyboard = []

    if (!memberships.channel1 || !memberships.channel2)
    {
        if (!memberships.channel1)
        {
            keyboard.push([{ text: 'عضویت در کانال اول ما 1️⃣', url: 'https://t.me/DeepDevs' }])
        }
        if (!memberships.channel2)
        {
            keyboard.push([{ text: 'عضویت در کانال دوم ما 2️⃣', url: 'https://t.me/InstaDevs' }])
        }
        keyboard.push([{ text: '👉 Use Bot 👈', callback_data: 'use_bot' }])
        bot.sendMessage(chatId, 'برای استفاده از این قابلیت، لطفاً در کانال‌های زیر عضو شوید ✔️', {
            reply_markup: {
                inline_keyboard: keyboard,
            }
        })
    } else
    {
        bot.sendMessage(chatId, 'شما در هر دو کانال عضو هستید. می‌توانید عکس خود را ⚠️ بصورت فایل ⚠️ آپلود کنید.')
    }
})




bot.on('callback_query', async (callbackQuery) =>
{
    const chatId = callbackQuery.message.chat.id
    const userId = callbackQuery.from.id
    const messageId = callbackQuery.message.message_id
    const data = callbackQuery.data

    if (data === 'use_bot')
    {
        const memberships = await checkPublicChannelMembership(userId)

        let errorMessage = ''
        let keyboard = []

        if (!memberships.channel1 && !memberships.channel2)
        {
            errorMessage = 'شما هنوز عضو هیچ کدام از کانال‌ها نیستید. لطفاً به کانال‌های زیر عضو شوید:'
            keyboard.push([{ text: 'عضویت در کانال اول ما 1️⃣', url: 'https://t.me/DeepDevs' }])
            keyboard.push([{ text: 'عضویت در کانال دوم ما 2️⃣', url: 'https://t.me/InstaDevs' }])
        } else if (!memberships.channel1)
        {
            errorMessage = 'شما هنوز عضو کانال 1 نیستید. لطفاً به آن عضو شوید:'
            keyboard.push([{ text: 'عضویت در کانال اول ما 1️⃣', url: 'https://t.me/DeepDevs' }])
        } else if (!memberships.channel2)
        {
            errorMessage = 'شما هنوز عضو کانال 2 نیستید. لطفاً به آن عضو شوید:'
            keyboard.push([{ text: 'عضویت در کانال دوم ما 2️⃣', url: 'https://t.me/InstaDevs' }])
        }

        if (errorMessage !== '')
        {
            errorMessage += '\nلطفاً دوباره دکمه "use bot" را بزنید و پس از عضویت در کانال‌ها، عکس خود را آپلود کنید.'
            keyboard.push([{ text: '👉 Use Bot 👈', callback_data: 'use_bot' }])
            bot.sendMessage(chatId, errorMessage, {
                reply_markup: {
                    inline_keyboard: keyboard,
                }
            })
        } else
        {
            bot.sendMessage(chatId, 'لطفا عکس مورد نظر خودتون رو ⚠️ بصورت فایل ⚠️ آپلود کنید ')
        }
    }

    bot.deleteMessage(chatId, messageId)
})

bot.onText(/\/help/, (msg) =>
{
    const chatId = msg.chat.id

    const helpMessage = `
    به ربات خوش آمدید! این ربات برای فشرده‌سازی تصاویر استفاده می‌شود.

    برای استفاده از ربات، ابتدا باید در کانال‌های زیر عضو شوید:
    1️⃣ [کانال اول](https://t.me/DeepDevs)
    2️⃣ [کانال دوم](https://t.me/InstaDevs)

    پس از عضویت در هر دو کانال، دکمهUse Bot رو بزنید و سپس می‌توانید عکس خود را (بصورت فایل) آپلود کنید و ربات آن را فشرده‌سازی کرده و برای شما ارسال می‌کند.

    برای شروع فشرده‌سازی عکس، فقط کافی است عکس مورد نظر خود را ارسال کنید.

    امیدواریم تجربه خوبی داشته باشید!`

    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown', disable_web_page_preview: true })
})