import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import util from "util";
import BaseLogger from "../../src/utils/logger";
import { ApiError } from "../../src/middleware/apiError";

const DEFAULT_TIMEOUT = 15000;

export default class HttpClient {
  logger: BaseLogger;
  timeout: number;
  axiosClient: AxiosInstance;

  constructor(logger: BaseLogger, config: AxiosRequestConfig = {}) {
    this.logger = logger;
    const { timeout } = config;

    this.timeout = timeout ?? DEFAULT_TIMEOUT;

    this.axiosClient = axios.create({
      ...config,
    });
  }

  async post<R = any>(
    url: string,
    data: any,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<R>> {
    return await this.request({ url, data, ...config, method: "POST" });
  }

  async patch<R = any>(
    url: string,
    data: any,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<R>> {
    return await this.request({ url, data, ...config, method: "PATCH" });
  }

  async put<R = any>(
    url: string,
    data: any,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<R>> {
    return await this.request({ url, data, ...config, method: "PUT" });
  }

  async get<R = any>(
    url: string,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<R>> {
    return await this.request({ url, ...config, method: "GET" });
  }

  async delete<R = any>(
    url: string,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<R>> {
    return await this.request({ url, ...config, method: "DELETE" });
  }

  async request(config: AxiosRequestConfig) {
    const cancelTokenSource = axios.CancelToken.source();
    config.cancelToken = cancelTokenSource.token;

    const logPrefix = `${config.method} ${config.url}`;

    const timeout = setTimeout(() => {
      this.logger.error(`${logPrefix}: Request timed out.`);
      cancelTokenSource.cancel();
    }, config.timeout ?? this.timeout);

    try {
      return await this.axiosClient.request(config);
    } catch (err) {
      const error = err as any;
      if (axios.isCancel(error)) {
        throw new ApiError(500, `${logPrefix}: Request cancelled.`);
      }

      throw new ApiError(
        error.response?.status ?? 500,
        `${logPrefix}: Request failed. Error: ${error.message}. Data: ${
          error.response?.data
            ? util.inspect(error.response.data)
            : error.message
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
