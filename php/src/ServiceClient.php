<?php

declare(strict_types=1);

namespace Fabraic;

final class ServiceClient
{
    private Client $client;
    private string $servicePath;
    private string $version;

    public function __construct(Client $client, string $servicePath, string $version)
    {
        $clean = trim($servicePath, '/');
        if ($clean === '') {
            throw new \InvalidArgumentException('`servicePath` must be a non-empty string.');
        }

        $this->client = $client;
        $this->servicePath = $clean;
        $this->version = $version !== '' ? $version : Client::DEFAULT_SERVICE_VERSION;
    }

    /** @param array<string, scalar> $pathParams */
    private function buildPath(string $path, array $pathParams = []): string
    {
        $cleanPath = str_starts_with($path, '/') ? $path : '/' . $path;

        foreach ($pathParams as $key => $value) {
            $cleanPath = str_replace('{' . $key . '}', rawurlencode((string) $value), $cleanPath);
        }

        return '/' . $this->servicePath . '/' . $this->version . $cleanPath;
    }

    /**
     * @param array<string, mixed> $options
     * @param array<string, scalar> $pathParams
     * @return mixed
     */
    public function request(string $method, string $path, array $options = [], array $pathParams = [])
    {
        return $this->client->request($method, $this->buildPath($path, $pathParams), $options);
    }

    /** @return mixed */
    public function get(string $path, array $options = [], array $pathParams = [])
    {
        return $this->request('GET', $path, $options, $pathParams);
    }

    /** @return mixed */
    public function post(string $path, array $options = [], array $pathParams = [])
    {
        return $this->request('POST', $path, $options, $pathParams);
    }

    /** @return mixed */
    public function put(string $path, array $options = [], array $pathParams = [])
    {
        return $this->request('PUT', $path, $options, $pathParams);
    }

    /** @return mixed */
    public function patch(string $path, array $options = [], array $pathParams = [])
    {
        return $this->request('PATCH', $path, $options, $pathParams);
    }

    /** @return mixed */
    public function delete(string $path, array $options = [], array $pathParams = [])
    {
        return $this->request('DELETE', $path, $options, $pathParams);
    }
}
