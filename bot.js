const TelegramBot = require('node-telegram-bot-api')
const saveImageData = require('./saveImageData')
const sharp = require('sharp')
const getUserImageData = require('./getUserImageData')

require('dotenv').config()

// توکن ربات تلگرام خود را در فایل .env قرار دهید
const token = process.env.BOT_TOKEN
const bot = new TelegramBot(token, { polling: true })

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

bot.onText(/\/start/, async (msg) =>
{
    const chatId = msg.chat.id
    const userId = msg.from.id

    const memberships = await checkPublicChannelMembership(userId)
    const keyboard = []

    if (!memberships.channel1)
    {
        keyboard.push([{ text: 'عضویت در کانال اول ما 1️⃣', url: 'https://t.me/channel1username' }])
    }
    if (!memberships.channel2)
    {
        keyboard.push([{ text: 'عضویت در کانال دوم ما 2️⃣', url: 'https://t.me/channel2username' }])
    }
    if (keyboard.length > 0)
    {
        keyboard.push([{ text: '👉 Use Bot 👈', callback_data: 'use_bot' }])
        bot.sendMessage(chatId, 'برای استفاده از این قابلیت، لطفاً در کانال‌های زیر عضو شوید ✔️', {
            reply_markup: {
                inline_keyboard: keyboard,
            }
        })
    } else
    {
        bot.sendMessage(chatId, 'شما در هر دو کانال عضو هستید. می‌توانید عکس خود را آپلود کنید.')
        // در اینجا می‌توانید منطق و عملکرد ربات بعد از عضویت در هر دو کانال را ادامه دهید
    }
})


// رویداد برای پاسخگویی به دکمه "use bot"
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

        // اگر کاربر به هیچ کانالی عضو نشده بود
        if (!memberships.channel1 && !memberships.channel2)
        {
            errorMessage = 'شما هنوز عضو هیچ کدام از کانال‌ها نیستید. لطفاً به کانال‌های زیر عضو شوید:'
            keyboard.push([{ text: 'عضویت در کانال اول ما 1️⃣', url: 'https://t.me/DeepDevs' }])
            keyboard.push([{ text: 'عضویت در کانال دوم ما 2️⃣', url: 'https://t.me/InstaDevs' }])
        }
        // اگر کاربر به یکی از کانال‌ها عضو نشده بود
        else if (!memberships.channel1)
        {
            errorMessage = 'شما هنوز عضو کانال 1 نیستید. لطفاً به آن عضو شوید:'
            keyboard.push([{ text: 'عضویت در کانال اول ما 1️⃣', url: 'https://t.me/DeepDevs' }])
        } else if (!memberships.channel2)
        {
            errorMessage = 'شما هنوز عضو کانال 2 نیستید. لطفاً به آن عضو شوید:'
            keyboard.push([{ text: 'عضویت در کانال دوم ما 2️⃣', url: 'https://t.me/InstaDevs' }])
        }

        // اگر کاربر به هیچ کانالی عضو نبود، پیام خطا را ارسال کنید
        if (errorMessage !== '')
        {
            errorMessage += '\nلطفاً دوباره دکمه "use bot" را بزنید و پس از عضویت در کانال‌ها، عکس خود را آپلود کنید.'
            keyboard.push([{ text: '👉 Use Bot 👈', callback_data: 'use_bot' }])
            bot.sendMessage(chatId, errorMessage, {
                reply_markup: {
                    inline_keyboard: keyboard,
                }
            })
        }
        // اگر کاربر به هیچ کانالی عضو نبود، ادامه بدهید
        else
        {
            bot.sendMessage(chatId, 'لطفا عکس مورد نظر خودتون رو آپلود کنید ')
            // اینجا می‌توانید منطق و عملکرد بعدی ربات (مانند دریافت عکس) را پیاده‌سازی کنید
        }
    }

    // حذف دکمه‌های انتخابی بعد از استفاده
    bot.deleteMessage(chatId, messageId)
})


// تابع برای فشرده‌سازی تصویر
async function compressImage (chatId, imageId)
{
    try
    {
        // دریافت تصویر از تلگرام
        const imageStream = await bot.getFileStream(imageId)

        // تبدیل تصویر به Buffer
        const imageBuffer = await streamToBuffer(imageStream)

        // فشرده‌سازی تصویر با استفاده از sharp
        const compressedImageBuffer = await sharp(imageBuffer).resize({ quality: 80 }).toBuffer()

        // ارسال تصویر فشرده شده به کاربر
        bot.sendPhoto(chatId, compressedImageBuffer)
    } catch (error)
    {
        console.error('Error compressing image:', error)
    }
}

// تابع برای تبدیل Stream به Buffer
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


// رویداد برای دریافت عکس از کاربر
bot.on('photo', async (msg) =>
{
    const chatId = msg.chat.id
    const userId = msg.from.id
    const imageId = msg.photo[0].file_id

    // ذخیره اطلاعات عکس در فایل
    saveImageData(userId, imageId)

    // از فایل JSON شناسه کاربر را دریافت کنید
    const userImageData = getUserImageData(userId)

    // اگر شناسه کاربر در فایل وجود دارد، فشرده‌سازی و ارسال تصویر به کاربر
    if (userImageData)
    {
        compressImage(chatId, userImageData.imageId) // تغییر این قسمت
    }

    // پیام تایید برای کاربر
    bot.sendMessage(chatId, 'عکس شما با موفقیت ذخیره شد.')
})