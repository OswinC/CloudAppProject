'use strict';

console.log('Loading Address.js...');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function(event, context, callback) {
    console.log('handler event: ' + JSON.stringify(event));
    console.log('handler context: ' + JSON.stringify(context));
    
    var operation = event.operation;

    switch (operation) {
        case ('read'):
            getAddress(event, callback);
            break;
        case ('create'):
            createAddress(event, callback);
            break;
        case ('update'):
            updateAddress(event, callback);
            break;
        case ('delete'):
            deleteAddress(event, callback);
            break;
        default:
            callback(new Error('Unrecognized operation "${event.operation}"'));
    }
};

function getAddress(event, callback) {
    
    var params = {
        TableName: 'Address',
        Key: {'UUID': event.UUID}
    };
    
    console.log('In getAddress, params is: ' + JSON.stringify(params));
    
    dynamo.getItem(params, function (err, data) {
       if (err) {
           console.log('getAddress err: ' + JSON.stringify(err));
           callback(err, null);
       } else {
           console.log('getAddress success, data: ' + JSON.stringify(data));
           callback(null, data);
       }
    });
}

function validateAddress(item, create) {
    // TODO: Check duplicate item
    if (create) {
        if (hasAllAttributes(item)) return 'newAddress does not have enough attributes';
    } 
    for (var col in item) {
        switch (col) {
            case ('city'):
                break;
            case ('street'):
                break;
            case ('number'):
                if (typeof item.number != 'number') return 'wrong type! number has to be a Js number type';
                break;
            case ('zip'):
                if (typeof item.zip != 'number') return 'wrong type! zip code has to be a Js number type'; 
                if (item.zip.toString().length != 5) return 'zip code has to be 5 digit long';
                break;
            default:
                return 'new address can not have colmun other than city, street, number and zip';
        }
    }
    return null;
}

function hashString(s) {
    // NOTE: This hash generates a signed int
    // Borrowed from a post on StackOverflow
    var hash = 0, i, chr, len;
    if (s.length === 0) return hash;
    for (i = 0, len = s.length; i < len; i++) {
        chr   = s.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

function genAddressID(item) {
    return hashString(item.city + item.street + item.number + item.zipcode);
}

function createAddress(event, callback) {
    var params = {
        TableName: 'Address',
        Item: event.item,
        ConditionExpression: ''
    };

    console.log('In createAddress, params is: ' + JSON.stringify(params));

    var err = validateAddress(params.Item, true);
    if (err) {
        console.log('validateAddress() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        params.Item.UUID = genAddressID(params.Item);
        params.ConditionExpression = 'attribute_not_exists(#myid)';
        params.ExpressionAttributeNames = {
            "#myid": "UUID"
        };

        // TODO: Prevent overwriting by condition expressions
        dynamo.putItem(params, function(err, data) {
            if (err) {
                // TODO check errtype == 'ConditionalCheckFailedException'
                console.log('createAddress err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('createAddress success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function updateExpression(updates) {
    var expr = "SET";

    for (var key in updates) {
        expr += " " + key + " = " + updates[key];
    }
    console.log("UpdateExpression: " + JSON.stringify(expr));

    return expr;
}

function hasAllAttributes(item) {
    // check whether the new Address has all four attributes city, number, street and zip
    var obj = {'city': false, 'number': false, 'street': false, 'zip' : false};
    for (var key in item) {
        if (key in obj) obj.key = true;
    }
    return obj.city && obj.number && obj.street && obj.zip;
}

function updateAddress(event, callback) {
    var params = {
        TableName: 'Address',
        Key: {'UUID': event.UUID},
        UpdateExpression: ''
    };

    console.log('In updateAddress, params is: ' + JSON.stringify(params));
    
    // TODO: Add condition expression 
    var err = validateAddress(event.updates, false);
    if (err) {
        console.log('validateAddress() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        params.UpdateExpression = updateExpression(event.updates);
        dynamo.updateItem(params, function(err, data) {
            if (err) {
                console.log('updateAddress err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('updateAddress success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function deleteAddress(event, callback) {
    var params = {
        TableName: 'Address',
        Key: {'UUID': event.UUID}
    };
    
    console.log('In deleteAddress, params is: ' + JSON.stringify(params));
    
    dynamo.deleteItem(params, function(err, data) {
        if (err) {
            console.log('deleteAddress err: ' + JSON.stringify(err));
            callback(err, null);
        } else {
            console.log('deleteAddress complete, data: ' + JSON.stringify(data));
            callback(null, data);
        }
    });
}