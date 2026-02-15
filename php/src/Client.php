<?php

declare(strict_types=1);

namespace Fabraic;

use GuzzleHttp\Client as HttpClient;

final class Client
{
    public const DEFAULT_BASE_URL = 'https://api.fabraic.co';
    public const DEFAULT_SERVICE_VERSION = 'v1';

    private HttpClient $httpClient;
    /** @var array<string, string> */
    private array $defaultHeaders;

    /**
     * @param array{
     *   api_key?: string,
     *   access_token?: string,
     *   base_url?: string,
     *   http_client?: HttpClient
     * } $config
     */
    public function __construct(array $config)
    {
        $apiKey = $config['api_key'] ?? null;
        $accessToken = $config['access_token'] ?? null;
        $baseUrl = rtrim((string) ($config['base_url'] ?? self::DEFAULT_BASE_URL), '/');

        if (!$apiKey && !$accessToken) {
            throw new \InvalidArgumentException('Provide either `api_key` or `access_token`.');
        }

        $this->defaultHeaders = ['Accept' => 'application/json'];

        if ($accessToken) {
            $this->defaultHeaders['Authorization'] = 'Bearer ' . $accessToken;
        } else {
            $this->defaultHeaders['x-api-key'] = (string) $apiKey;
        }

        $this->httpClient = $config['http_client'] ?? new HttpClient([
            'base_uri' => $baseUrl,
        ]);
    }

    public function service(string $servicePath, string $version = self::DEFAULT_SERVICE_VERSION): ServiceClient
    {
        return new ServiceClient($this, $servicePath, $version);
    }

    /**
     * @param array<string, mixed> $options
     * @return mixed
     */
    public function request(string $method, string $path, array $options = [])
    {
        $uri = ltrim($path, '/');
        $headers = $options['headers'] ?? [];
        $options['headers'] = array_merge($this->defaultHeaders, $headers);

        $response = $this->httpClient->request($method, $uri, $options);
        $body = (string) $response->getBody();

        if ($body === '') {
            return null;
        }

        return json_decode($body, true, flags: JSON_THROW_ON_ERROR);
    }
}
