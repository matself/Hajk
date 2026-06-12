import { useCallback, useRef } from "react";
import { hfetch } from "../../../utils/FetchWrapper";
import {
  getDataDownloadUrl,
  getDataUploadUrl,
  getJobStatusUrl,
  getSubmitJobUrl,
  getWorkspaceParametersUrl,
} from "../api/endpoints";
import { parseUploadedFilePath } from "../api/fileUpload";
import {
  buildSubmitBody,
  extractJobStatus,
  normalizeJobStatus,
  parseSubmitJobId,
} from "../api/jobs";
import { normalizeParametersResponse } from "../api/publishedParameters";
import type {
  FmeFileUploadResult,
  FmeProduct,
  FmeServerApi,
  FmeServerModelInterface,
  PublishedParameter,
} from "../types";
import useFmeApiVersion from "./useFmeApiVersion";

/**
 * Hook to use the FME server API.
 * This is used to fetch the product parameters, upload files, submit orders, and fetch job status.
 */
export default function useFmeServerApi(
  proxyBase: string,
  model: FmeServerModelInterface
): FmeServerApi {
  const { apiVersion, isReady, isResolving, error } =
    useFmeApiVersion(proxyBase);
  const uploadSessionId = useRef(crypto.randomUUID());

  const uploadParameterFile = useCallback(
    async (product: FmeProduct, file: File): Promise<FmeFileUploadResult> => {
      try {
        const formData = new FormData();
        formData.append("file", file, file.name);

        const response = await hfetch(
          getDataUploadUrl(proxyBase, product, {
            sessionId: uploadSessionId.current,
          }),
          {
            method: "POST",
            body: formData,
            credentials: "same-origin",
          }
        );
        const data = await response.json();
        const path = parseUploadedFilePath(data);
        if (!response.ok || !path) {
          return { error: true, path: null };
        }
        return { error: false, path };
      } catch {
        return { error: true, path: null };
      }
    },
    [proxyBase]
  );

  const fetchProductParameters = useCallback(
    async (groupName: string, productName: string) => {
      if (!isReady || !apiVersion) {
        return { error: true, parameters: [] as PublishedParameter[] };
      }

      const product = model.getProduct(groupName, productName);
      if (!product) {
        return { error: true, parameters: [] as PublishedParameter[] };
      }

      try {
        const url = getWorkspaceParametersUrl(
          proxyBase,
          product.repository,
          product.workspace,
          apiVersion
        );
        const response = await hfetch(url);
        const data = await response.json();
        return {
          error: false,
          parameters: normalizeParametersResponse(data),
        };
      } catch {
        return { error: true, parameters: [] as PublishedParameter[] };
      }
    },
    [apiVersion, isReady, model, proxyBase]
  );

  const submitApiOrder = useCallback(
    async (
      product: NonNullable<ReturnType<typeof model.getProduct>>,
      productParameters: PublishedParameter[]
    ) => {
      if (!isReady || !apiVersion) {
        return { error: true, jobId: null };
      }

      const parametersToSend = model.buildParametersToSend(
        product,
        productParameters
      );

      try {
        const url = getSubmitJobUrl(proxyBase, product, apiVersion);
        const response = await hfetch(url, {
          method: "POST",
          body: JSON.stringify(
            buildSubmitBody(product, parametersToSend, apiVersion)
          ),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        return { error: false, jobId: parseSubmitJobId(data) };
      } catch {
        return { error: true, jobId: null };
      }
    },
    [apiVersion, isReady, model, proxyBase]
  );

  const submitDataDownloadOrder = useCallback(
    async (
      product: NonNullable<ReturnType<typeof model.getProduct>>,
      productParameters: PublishedParameter[],
      userEmail: string
    ) => {
      try {
        const response = await hfetch(getDataDownloadUrl(proxyBase, product), {
          method: "POST",
          body: model.buildDataDownloadFormBody(
            product,
            productParameters,
            userEmail
          ),
          credentials: "same-origin",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const data = await response.json();
        return {
          error: false,
          jobId: (data?.serviceResponse?.jobID as string | undefined) ?? null,
        };
      } catch {
        return { error: true, jobId: null };
      }
    },
    [model, proxyBase]
  );

  const fetchJobStatus = useCallback(
    async (jobId: string) => {
      if (!jobId || !isReady || !apiVersion) {
        return { error: true, status: null };
      }

      try {
        const response = await hfetch(
          getJobStatusUrl(proxyBase, jobId, apiVersion)
        );
        const data = await response.json();
        return {
          error: false,
          status: normalizeJobStatus(extractJobStatus(data), apiVersion),
        };
      } catch {
        return { error: true, status: null };
      }
    },
    [apiVersion, isReady, proxyBase]
  );

  const placeOrder = useCallback(
    async (
      groupName: string,
      productName: string,
      productParameters: PublishedParameter[],
      userEmail: string
    ) => {
      const product = model.getProduct(groupName, productName);
      if (!product) {
        return { error: true, jobId: null };
      }

      if (userEmail !== "" && product.promptForEmail) {
        return submitDataDownloadOrder(product, productParameters, userEmail);
      }

      return submitApiOrder(product, productParameters);
    },
    [model, submitApiOrder, submitDataDownloadOrder]
  );

  return {
    apiVersion,
    isReady,
    isResolving,
    error,
    fetchProductParameters,
    uploadParameterFile,
    placeOrder,
    fetchJobStatus,
  };
}
