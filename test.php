<!DOCTYPE html>
<body>
<fieldset>
<legend>Debug functions! Test output!</legend>
<form action="index.php" method="post">
    <input name="time" type="hidden" value="<script>document.write(new Date());</script>" />
    <input name="input" type="text" />
    <select name="function">
        <option value="newOrder-i">newOrder (inject)</option>
    </select>
    errors: <input name="displayErrors" type="checkbox" value="1" checked/>
    notices: <input name="displayNotices" type="checkbox" value="1" checked/>
    <input type="submit" value="submit" />
</form>
</body>
</html>

<?php
include('api.php');
date_default_timezone_set('America/New_York');

if ($_POST['displayErrors']) error_reporting(E_ERROR);
if ($_POST['displayNotices']) error_reporting(E_NOTICE);
ini_set('display_errors', '1');
better_print_r($_POST);
echo "</fieldset>";

$input = $_POST['input'];
switch ($_POST['function'])
{
    case 'test':
        better_print_r(test($batchSize, $filter));
        break;
}
?>
