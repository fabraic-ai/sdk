# fabraic PHP SDK

## Install

```bash
composer require fabraic/sdk-php
```

## Usage

```php
<?php

use Fabraic\Client;

$client = new Client([
    'api_key' => getenv('FABRAIC_API_KEY'),
]);

$system = $client->service('system', 'v1');
$workspaces = $system->get('/workspaces', ['query' => ['limit' => 25]]);
```
