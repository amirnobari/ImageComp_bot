// ماژول fs برای خواندن و نوشتن فایل‌ها
const fs = require('fs')

// تابع برای ذخیره اطلاعات عکس کاربر در فایل JSON
function saveImageData (userId, imageId)
{
    // مسیر فایل JSON برای خواندن و نوشتن اطلاعات
    const filePath = 'user_images.json'

    try
    {
        // خواندن اطلاعات از فایل
        let userData = []
        try
        {
            userData = JSON.parse(fs.readFileSync(filePath))
        } catch (error)
        {
            console.error('Error reading file:', error)
        }

        // جستجوی اطلاعات مربوط به کاربر در فایل
        const userIndex = userData.findIndex(data => data.userId === userId)

        // اگر کاربر در فایل وجود داشت، اطلاعات عکس جدید را جایگزین عکس قبلی کاربر کنید
        if (userIndex !== -1)
        {
            userData[userIndex].imageId = imageId
        } else
        {
            // اگر کاربر در فایل وجود نداشت، اطلاعات جدید را به فایل اضافه کنید
            userData.push({ userId, imageId })
        }

        // نوشتن اطلاعات به فایل
        fs.writeFileSync(filePath, JSON.stringify(userData))
    } catch (error)
    {
        console.error('Error saving file:', error)
    }
}

module.exports = saveImageData
