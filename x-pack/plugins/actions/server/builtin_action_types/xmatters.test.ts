/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./lib/post_xmatters', () => ({
  postXmatters: jest.fn(),
}));

import { Services } from '../types';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { postXmatters } from './lib/post_xmatters';
import { actionsConfigMock } from '../actions_config.mock';
import { createActionTypeRegistry } from './index.test';
import { Logger } from '../../../../../src/core/server';
import { actionsMock } from '../mocks';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ActionTypeSecretsType,
  getActionType,
  XmattersActionType,
} from './xmatters';

const postxMattersMock = postXmatters as jest.Mock;

const ACTION_TYPE_ID = '.xmatters';

const services: Services = actionsMock.createServices();

let actionType: XmattersActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<
    ActionTypeConfigType,
    ActionTypeSecretsType,
    ActionParamsType
  >(ACTION_TYPE_ID);
  mockedLogger = logger;
});

describe('actionType', () => {
  test('exposes the action as `xmatters` on its Id and Name', () => {
    expect(actionType.id).toEqual('.xmatters');
    expect(actionType.name).toEqual('xMatters');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid', () => {
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('fails when secret user is provided, but password is omitted', () => {
    expect(() => {
      validateSecrets(actionType, { user: 'bob' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Both user and password must be specified"`
    );
  });

  test('succeeds when basic authentication credentials are omitted', () => {
    expect(validateSecrets(actionType, {})).toEqual({ password: null, user: null });
  });

  test('succeeds when URL auth used', () => {
    const secrets: Record<string, string> = {
      user: '',
      password: '',
      secretsUrl: 'http://mylisteningserver:9200/endpoint?apiKey=someKey',
    };
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('fails when user, password, and secretsUrl are omitted', () => {
    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Either user and password or URL authentication must be specified"`
    );
  });

  test('fails when user, password, and secretsUrl are provided', () => {
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
      secretsUrl: 'https://someUrl.com',
    };
    expect(() => {
      validateSecrets(actionType, secrets);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: Either user and password or URL authentication must be specified"`
    );
  });
});

describe('config validation', () => {
  test('config validation passes when only required fields are provided', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver:9200/endpoint',
      usesBasic: true,
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
    });
  });

  test('config validation passes when a url is specified', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'http://mylisteningserver:9200/endpoint',
      usesBasic: true,
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
    });
  });

  test('config validation failed when a url is invalid', () => {
    const config: Record<string, string | boolean> = {
      configUrl: 'example.com/do-something',
      usesBasic: true,
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      '"error validating action type config: Error configuring xMatters action: unable to parse url: TypeError: Invalid URL: example.com/do-something"'
    );
  });

  test('config validation passes when kibana config url does not present in allowedHosts', () => {
    // any for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: true,
    };

    expect(validateConfig(actionType, config)).toEqual({
      ...config,
    });
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (_) => {
          throw new Error(`target url is not present in allowedHosts`);
        },
      },
    });

    // any for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {
      configUrl: 'http://mylisteningserver.com:9200/endpoint',
      usesBasic: true,
    };

    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: Error configuring xMatters action: target url is not present in allowedHosts"`
    );
  });

  test('config validations returns successful when URL auth used', () => {
    const config: Record<string, boolean> = {
      usesBasic: false,
    };

    expect(validateConfig(actionType, config)).toEqual({
      ...config,
    });
  });
});

describe('params validation', () => {
  test('param validation passes when only required fields are provided', () => {
    const params: Record<string, string> = {
      severity: 'high',
    };
    expect(validateParams(actionType, params)).toEqual({
      severity: 'high',
    });
  });

  test('params validation passes when a valid parameters are provided', () => {
    const params: Record<string, string> = {
      alertActionGroupName: 'Small t-shirt',
      signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234',
      ruleName: 'Test xMatters',
      date: '2022-01-18T19:01:08.818Z',
      severity: 'high',
      spaceId: 'default',
      tags: 'test1, test2',
    };
    expect(validateParams(actionType, params)).toEqual({
      ...params,
    });
  });
});

describe('execute()', () => {
  beforeAll(() => {
    postxMattersMock.mockReset();
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: actionsConfigMock.create(),
    });
  });

  beforeEach(() => {
    postxMattersMock.mockReset();
    postxMattersMock.mockResolvedValue({
      status: 200,
      statusText: '',
      data: '',
      config: {},
    });
  });

  test('execute with username/password sends request with basic auth', async () => {
    const config: ActionTypeConfigType = {
      configUrl: 'https://abc.def/my-xmatters',
      usesBasic: true,
    };
    await actionType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { user: 'abc', password: '123' },
      params: {
        alertActionGroupName: 'Small t-shirt',
        signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234',
        ruleName: 'Test xMatters',
        date: '2022-01-18T19:01:08.818Z',
        severity: 'high',
        spaceId: 'default',
        tags: 'test1, test2',
      },
    });

    const { url, data, auth } = postxMattersMock.mock.calls[0][0];
    expect({ url, data, auth }).toMatchInlineSnapshot(`
      Object {
        "auth": {
          "user": "abc",
          "password": "123,
        },
        "data": Object {
          "alertActionGroupName": "Small t-shirt",
          "date": "2022-01-18T19:01:08.818Z",
          "ruleName": "Test xMatters",
          "severity": "high",
          "signalId": "c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234",
          "spaceId": "default",
          "tags": "test1, test2",
        },
        "url": "https://abc.def/my-xmatters",
      }
    `);
  });

  test('execute with exception maxContentLength size exceeded should log the proper error', async () => {
    const config: ActionTypeConfigType = {
      configUrl: 'https://abc.def/my-xmatters',
      usesBasic: true,
    };
    postxMattersMock.mockReset();
    postxMattersMock.mockRejectedValueOnce({
      tag: 'err',
      message: 'maxContentLength size of 1000000 exceeded',
    });
    await actionType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { user: 'abc', password: '123' },
      params: {
        alertActionGroupName: 'Small t-shirt',
        signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234',
        ruleName: 'Test xMatters',
        date: '2022-01-18T19:01:08.818Z',
        severity: 'high',
        spaceId: 'default',
        tags: 'test1, test2',
      },
    });
    expect(mockedLogger.error).toBeCalledWith(
      'Error on some-id xMatters event: maxContentLength size of 1000000 exceeded'
    );
  });

  test('execute without username/password sends request without basic auth', async () => {
    const config: ActionTypeConfigType = {
      usesBasic: false,
    };
    const secrets: ActionTypeSecretsType = {
      user: null,
      password: null,
      secretsUrl: 'https://abc.def/my-xmatters?apiKey=someKey',
    };
    await actionType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets,
      params: {
        alertActionGroupName: 'Small t-shirt',
        signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234',
        ruleName: 'Test xMatters',
        date: '2022-01-18T19:01:08.818Z',
        severity: 'high',
        spaceId: 'default',
        tags: 'test1, test2',
      },
    });

    expect(postxMattersMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "basicAuth": undefined,
        "data": Object {
          "alertActionGroupName": "Small t-shirt",
          "date": "2022-01-18T19:01:08.818Z",
          "ruleName": "Test xMatters",
          "severity": "high",
          "signalId": "c9437cab-6a5b-45e8-bc8a-f4a8af440e97:abcd-1234",
          "spaceId": "default",
          "tags": "test1, test2",
        },
        "url": "https://abc.def/my-xmatters?apiKey=someKey",
      }
    `);
  });
});
