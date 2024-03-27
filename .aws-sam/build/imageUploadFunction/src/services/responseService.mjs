export const getProcessedResponse = (params, allowCredentials) => {
    return {
        ...params,
        headers: 
        {
            ...(allowCredentials ? {'Access-Control-Allow-Credentials' : true } : {}), 
            ...{
            "Access-Control-Allow-Headers" : "Content-Type,Authorization",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
        }
    };
}

export const getStringifyResponse = (params, allowCredentials) => {
    return {
        ...getProcessedResponse(params, allowCredentials),
        body: JSON.stringify(params.body)
    };
}
