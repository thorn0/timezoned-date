// Documentation for Sweet.js 0.x (pre-1.0): http://sweetjs.org/doc/main/sweet.html

let function = macro {
    case { _ $name $args $body } => {
        var name = unwrapSyntax(#{ $name });
        var functionToRemove = ['addGetters', 'addSetters', 'createFunction'];
        if (functionToRemove.indexOf(name) !== -1) {
            return #{};
        }
        return #{ function $name $args $body };
    }
    case { _ $args $body } => {
        return #{ function $args $body };
    }
}
export function;

macro addGetters {
    case { _($property: lit); } => {
        // breaking hygiene
        letstx $nativeProto = [makeIdent("nativeProto", #{ $property })];
        letstx $protoMethods = [makeIdent("protoMethods", #{ $property })];
        letstx $getLocalDate = [makeIdent("getLocalDate", #{ $property })];

        var property = unwrapSyntax(#{ $property });

        letstx $getterIdent = [makeIdent('get' + property, #{ $property })];
        letstx $utcGetterIdent = [makeIdent('getUTC' + property, #{ $property })];
        return #{

            $protoMethods.$getterIdent = function $getterIdent() {
                return $getLocalDate(this).$utcGetterIdent();
            };
            $protoMethods.$utcGetterIdent = $nativeProto.$utcGetterIdent;

        };
    }
}
export addGetters;

macro addSetters {
    case { _($property: lit); } => {
        // breaking hygiene
        letstx $nativeProto = [makeIdent("nativeProto", #{ $property })];
        letstx $protoMethods = [makeIdent("protoMethods", #{ $property })];
        letstx $getLocalDate = [makeIdent("getLocalDate", #{ $property })];
        letstx $offsetInMilliseconds = [makeIdent("offsetInMilliseconds", #{ $property })];

        var property = unwrapSyntax(#{ $property });

        letstx $setterIdent = [makeIdent('set' + property, #{ $property })];
        letstx $utcSetterIdent = [makeIdent('setUTC' + property, #{ $property })];
        var setterArgs = [];
        var setterLength = Date.prototype['set' + property].length;
        for (var i = 0; i < setterLength; i++) {
            setterArgs.push(makeIdent('a' + i, #{ $property }));
        }
        letstx $setterArgs = setterArgs;
        return #{

            $protoMethods.$setterIdent = function $setterIdent($setterArgs) {
                return this.setTime($nativeProto.$utcSetterIdent.apply($getLocalDate(this), arguments) - $offsetInMilliseconds);
            };
            $protoMethods.$utcSetterIdent = $nativeProto.$utcSetterIdent;

        };
    }
}
export addSetters;