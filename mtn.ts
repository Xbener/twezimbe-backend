
const authString = `c72025f5-5cd1-4630-99e4-8ba4722fad56:a8184e9a26be42e693072de6368f630f`;
const base64Auth = Buffer.from(authString).toString('base64');

const getAccessToken = async () => {
    try {
        const response = await fetch(`https://sandbox.momodeveloper.mtn.com/collection/token/`, {
            method: "POST",
            headers: {
                'Authorization': `Basic ${base64Auth}`,
                'Ocp-Apim-Subscription-Key': "1c04c38296bb456db78396975638027d"
            }
        });
        const data = await response.json()
        console.log(data)
    } catch (error) {
        console.error('Error fetching access token:', error);
        throw error;
    }
};

getAccessToken()
