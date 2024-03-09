export const getProcessedResponse = (params) => {
    return {
        ...params,
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
    };
}

export const getStringifyResponse = (params) => {
    return {
        ...getProcessedResponse(params),
        body: JSON.stringify(params.body)
    };
}
