angular.module('directives', ['ionic'])

.directive('groupedRadio', function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
            model: '=ngModel',
            value: '=groupedRadio'
        },
        link: function(scope, element, attrs, ngModelCtrl) {
            element.addClass('button button-small');
            element.on('click', function(e) {
                scope.$apply(function() {
                    ngModelCtrl.$setViewValue(scope.value);
                });
            });

            scope.$watch('model', function(newVal) {
                element.removeClass('button-positive');
                if (newVal === scope.value) {
                    element.addClass('button-positive');
                }
            });
        }
    };
})

// Thanks to IonicBurger for this one http://stackoverflow.com/a/36739953
.directive('disabletap', function($timeout) {
    return {
        link: function() {
            $timeout(function() {
                container = document.getElementsByClassName('pac-container');
                // disable ionic data tab
                angular.element(container).attr('data-tap-disabled', 'true');
                // leave input field if google-address-entry is selected
                angular.element(container).on("click", function() {
                    document.getElementById('type-selector').blur();
                });

            }, 500);
        }
    };
});
