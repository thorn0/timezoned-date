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
}
export function;

macro addGetters {
    case { _($property: lit); } => {
        // breaking hygiene
        letstx $nativeProto = [makeIdent("nativeProto", #{ $property })];
        letstx $constructor = [makeIdent("constructor", #{ $property })];
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
        letstx $constructor = [makeIdent("constructor", #{ $property })];
        letstx $protoMethods = [makeIdent("protoMethods", #{ $property })];
        letstx $getLocalDate = [makeIdent("getLocalDate", #{ $property })];
        letstx $applyOffset = [makeIdent("applyOffset", #{ $property })];

        var property = unwrapSyntax(#{ $property });

        letstx $setterIdent = [makeIdent('set' + property, #{ $property })];
        letstx $utcSetterIdent = [makeIdent('setUTC' + property, #{ $property })];
        var setterArgs = [];
        var setterLength = Date.prototype['set' + property].length;
        for (var i = 0; i < setterLength; i++) {
            setterArgs.push(makeIdent('_a' + i, #{ $property }));
        }
        letstx $setterArgs = setterArgs;
        return #{

            $protoMethods.$setterIdent = function $setterIdent($setterArgs) {
                if (!(this instanceof $constructor)) {
                    throw new TypeError();
                }
                var localDate = $getLocalDate(this);
                $nativeProto.$utcSetterIdent.apply(localDate, arguments);
                return this.setTime($applyOffset(localDate, -this.offset()));
            };
            $protoMethods.$utcSetterIdent = $nativeProto.$utcSetterIdent;

        };
    }
}
export addSetters;