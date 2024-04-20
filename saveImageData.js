const fs = require('fs')

function saveImageData (userId, imageId)
{
    const filePath = 'user_images.json'

    try
    {
        let userData = []
        try
        {
            userData = JSON.parse(fs.readFileSync(filePath))
        } catch (error)
        {
            console.error('Error reading file:', error)
        }

        const userIndex = userData.findIndex(data => data.userId === userId)

        if (userIndex !== -1)
        {
            userData[userIndex].imageId = imageId
        } else
        {
            userData.push({ userId, imageId })
        }

        fs.writeFileSync(filePath, JSON.stringify(userData))
    } catch (error)
    {
        console.error('Error saving file:', error)
    }
}

module.exports = saveImageData