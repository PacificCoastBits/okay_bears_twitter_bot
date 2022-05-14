const DEFAULT_NAMESPACE = "Application";

const info = (message: unknown, namespace?: string | unknown) => {
    if (typeof message === "string") {
        console.log(
            `[${getDate()}][${
                namespace || DEFAULT_NAMESPACE
            }] [INFO] ${message}`
        );
    } else {
        console.log(
            `[${getDate()}][${namespace || DEFAULT_NAMESPACE}] [INFO]`,
            message
        );
    }
};

const warn = (message: unknown, namespace?: string | unknown) => {
    if (typeof message === "string") {
        console.log(
            `[${getDate()}][${
                namespace || DEFAULT_NAMESPACE
            }] [WARN] ${message}`
        );
    } else {
        console.log(
            `[${getDate()}][${namespace || DEFAULT_NAMESPACE}] [WARN]`,
            message
        );
    }
};

const error = (message: unknown, namespace?: string | unknown) => {
    if (typeof message === "string") {
        console.log(
            `[${getDate()}][${
                namespace || DEFAULT_NAMESPACE
            }] [ERROR] ${message}`
        );
    } else {
        console.log(
            `[${getDate()}][${namespace || DEFAULT_NAMESPACE}] [ERROR]`,
            message
        );
    }
};

const getDate = () => {
    return new Date().toISOString();
};

const logging = {
    info,
    warn,
    error,
};

export default logging;
