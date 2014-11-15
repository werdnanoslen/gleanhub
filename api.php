<?php

include 'db_credentials.php';

function better_print_r($input)
{
    echo "<pre>";
    print_r($input);
    echo "</pre>";
}

function test()
{
    $db = new PDO("mysql:host=".HOST.";dbname=".DATABASE, USERNAME, PASSWORD);
    $statement = $db->prepare("SELECT * FROM test");
    $statement->execute();
    $ret = $statement->fetchAll(PDO::FETCH_ASSOC);
    print_r(json_encode($ret));
}

?>
